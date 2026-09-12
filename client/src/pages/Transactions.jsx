import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal, { Field } from '../components/Modal.jsx';
import { fmtINR2, todayISO } from '../lib/format.js';
import { guessMerchant } from '../lib/classify.js';

export default function Transactions() {
  const { transactions, categories, addTransaction, updateTransaction, deleteTransaction, changeCategoryWithMemory, loading } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [confFilter, setConfFilter] = useState('all');
  const [showManual, setShowManual] = useState(false);

  const filtered = useMemo(() => {
    let list = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (search) list = list.filter(t => (t.description + ' ' + t.merchant).toLowerCase().includes(search.toLowerCase()));
    if (catFilter !== 'all') list = list.filter(t => t.category === catFilter);
    if (typeFilter !== 'all') list = list.filter(t => (t.flag || 'expense') === typeFilter);
    if (confFilter === 'low') list = list.filter(t => t.confidence < 70);
    return list;
  }, [transactions, search, catFilter, typeFilter, confFilter]);

  const exportCSV = () => {
    if (!transactions.length) { toast('Nothing to export yet.'); return; }
    const rows = transactions.map(t => ({
      Date: t.date, Description: t.description, Merchant: t.merchant, Category: t.category,
      Type: t.type, Flag: t.flag || 'expense', Amount: t.amount, Confidence: t.confidence,
      Tags: (t.tags || []).join(';'), Notes: t.notes || '',
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'money-rescue-transactions.csv'; a.click();
  };

  if (loading) return <div className="text-muted">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[22px] font-bold tracking-tight">Transactions</div>
          <div className="text-muted text-[13px] mt-0.5">{transactions.length} total transactions</div>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => setShowManual(true)}>+ Add manually</button>
          <button className="btn" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      {!transactions.length ? (
        <div className="empty-state">
          <h4 className="text-text text-[15px] font-bold mb-1.5">No transactions yet</h4>
          <p className="text-sm mb-4">Upload a statement or add transactions manually.</p>
          <Link to="/upload" className="btn btn-primary">Upload statement</Link>
        </div>
      ) : (
        <>
          <div className="card mb-4 py-3.5 px-4">
            <div className="flex gap-2.5 flex-wrap items-center">
              <input className="field-input max-w-[260px]" placeholder="Search description or merchant…" value={search} onChange={e => setSearch(e.target.value)} />
              <select className="field-input max-w-[160px]" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="field-input max-w-[160px]" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="all">All types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
                <option value="refund">Refund</option>
                <option value="atm">ATM</option>
                <option value="investment">Investment</option>
              </select>
              <select className="field-input max-w-[190px]" value={confFilter} onChange={e => setConfFilter(e.target.value)}>
                <option value="all">All confidence</option>
                <option value="low">Needs clarification (&lt;70%)</option>
              </select>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-left">
                  <Th>Date</Th><Th>Description</Th><Th>Category</Th><Th>Type</Th>
                  <Th className="text-right">Amount</Th><Th>Confidence</Th><Th></Th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 300).map(t => (
                  <TxRow key={t.id} t={t} categories={categories} onCategoryChange={changeCategoryWithMemory} onFlagChange={(flag) => updateTransaction(t.id, { flag })} onDelete={deleteTransaction} />
                ))}
              </tbody>
            </table>
            {filtered.length > 300 ? <div className="text-xs text-muted2 p-3">Showing first 300 of {filtered.length} matching transactions. Narrow your filters to see more.</div> : null}
          </div>
        </>
      )}

      {showManual ? (
        <ManualAddModal categories={categories} onClose={() => setShowManual(false)} onAdd={async (t) => {
          await addTransaction(t); setShowManual(false); toast('Transaction added.');
        }} />
      ) : null}
    </div>
  );
}

function Th({ children, className = '' }) {
  return <th className={`text-muted font-semibold text-[11.5px] uppercase tracking-wide py-2.5 px-2.5 border-b border-border ${className}`}>{children}</th>;
}

function TxRow({ t, categories, onCategoryChange, onFlagChange, onDelete }) {
  return (
    <tr className="border-b border-border hover:bg-white/[0.015]">
      <td className="py-2.5 px-2.5 tabular-nums">{t.date || '—'}</td>
      <td className="py-2.5 px-2.5">
        {(t.description || '').slice(0, 50)}
        {t.notes ? <div className="text-muted2 text-[11px]">📝 {t.notes}</div> : null}
      </td>
      <td className="py-2.5 px-2.5">
        <select className="field-input" value={t.category} onChange={e => onCategoryChange(t, e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </td>
      <td className="py-2.5 px-2.5">
        <select className="field-input" value={t.flag || ''} onChange={e => onFlagChange(e.target.value || null)}>
          <option value="">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
          <option value="refund">Refund</option>
          <option value="atm">ATM</option>
          <option value="investment">Investment</option>
        </select>
      </td>
      <td className={`py-2.5 px-2.5 text-right tabular-nums ${t.type === 'credit' ? 'text-good' : 'text-text'}`}>
        {t.type === 'credit' ? '+' : '-'}{fmtINR2(t.amount)}
      </td>
      <td className="py-2.5 px-2.5"><ConfBadge c={t.confidence} /></td>
      <td className="py-2.5 px-2.5"><button className="btn btn-ghost btn-sm" onClick={() => onDelete(t.id)}>✕</button></td>
    </tr>
  );
}

export function ConfBadge({ c }) {
  if (c >= 85) return <span className="pill pill-good">{c}%</span>;
  if (c >= 70) return <span className="pill pill-warn">{c}%</span>;
  return <span className="pill pill-bad">{c}% — review</span>;
}

function ManualAddModal({ categories, onClose, onAdd }) {
  const [date, setDate] = useState(todayISO());
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [type, setType] = useState('debit');
  const [cat, setCat] = useState(categories[0] || 'Other');
  const toast = useToast();

  const submit = () => {
    const amount = parseFloat(amt);
    if (!date || !desc.trim() || !amount) { toast('Please fill in date, description and amount.'); return; }
    onAdd({
      date, description: desc.trim(), merchant: guessMerchant(desc.trim()), amount: Math.abs(amount),
      type, category: cat, confidence: 100, flag: null, account: 'Manual', tags: [], notes: '', source: 'manual',
    });
  };

  return (
    <Modal title="Add transaction manually" onClose={onClose} onConfirm={submit} confirmLabel="Add">
      <Field label="Date"><input className="field-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Description"><input className="field-input" placeholder="e.g. Swiggy order" value={desc} onChange={e => setDesc(e.target.value)} /></Field>
      <Field label="Amount"><input className="field-input" type="number" placeholder="0" value={amt} onChange={e => setAmt(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <select className="field-input" value={type} onChange={e => setType(e.target.value)}>
            <option value="debit">Money out</option>
            <option value="credit">Money in</option>
          </select>
        </Field>
        <Field label="Category">
          <select className="field-input" value={cat} onChange={e => setCat(e.target.value)}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
