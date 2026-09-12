import React, { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { fmtINR } from '../lib/format.js';
import { TrendLineChart } from '../components/Charts.jsx';
import Modal, { Field } from '../components/Modal.jsx';

export default function NetWorth() {
  const { netWorth, addNetWorthItem, deleteNetWorthItem, snapshotNetWorth, loading } = useData();
  const [modalKind, setModalKind] = useState(null); // 'asset' | 'liability' | null

  if (loading) return <div className="text-muted">Loading…</div>;

  const assets = netWorth.assets.reduce((s, a) => s + a.amount, 0);
  const liabilities = netWorth.liabilities.reduce((s, a) => s + a.amount, 0);
  const has = netWorth.assets.length || netWorth.liabilities.length;
  const total = has ? assets - liabilities : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[22px] font-bold tracking-tight">Net Worth</div>
          <div className="text-muted text-[13px] mt-0.5">Manually tracked assets and liabilities — not derived from transaction data.</div>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => setModalKind('asset')}>+ Asset</button>
          <button className="btn" onClick={() => setModalKind('liability')}>+ Liability</button>
        </div>
      </div>

      {total !== null ? (
        <>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="stat-card"><div className="stat-label">Assets</div><div className="stat-value text-good">{fmtINR(assets)}</div></div>
            <div className="stat-card"><div className="stat-label">Liabilities</div><div className="stat-value text-bad">{fmtINR(liabilities)}</div></div>
            <div className="stat-card"><div className="stat-label">Net Worth</div><div className="stat-value">{fmtINR(total)}</div></div>
          </div>
          {netWorth.history.length > 1 ? (
            <div className="card mb-6">
              <div className="card-title">History</div>
              <TrendLineChart labels={netWorth.history.map(h => h.date)} data={netWorth.history.map(h => h.total)} color="#8B6CFF" />
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-state mb-6">
          <h4 className="text-text text-[15px] font-bold mb-1.5">Net worth not available yet</h4>
          <p className="text-sm">Add your assets and liabilities to calculate net worth.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="card-title">Assets</div>
          {netWorth.assets.length ? netWorth.assets.map(a => (
            <ItemRow key={a.id} item={a} onDelete={() => deleteNetWorthItem(a.id)} />
          )) : <div className="text-xs text-muted2">No assets added yet.</div>}
        </div>
        <div className="card">
          <div className="card-title">Liabilities</div>
          {netWorth.liabilities.length ? netWorth.liabilities.map(a => (
            <ItemRow key={a.id} item={a} onDelete={() => deleteNetWorthItem(a.id)} />
          )) : <div className="text-xs text-muted2">No liabilities added yet.</div>}
        </div>
      </div>

      <div>
        <button className="btn" onClick={snapshotNetWorth}>Save today's snapshot</button>
        {netWorth.history.length ? <span className="text-xs text-muted2 ml-2.5">{netWorth.history.length} snapshot(s) saved</span> : null}
      </div>

      {modalKind ? (
        <AddNWModal
          kind={modalKind}
          onClose={() => setModalKind(null)}
          onAdd={async (name, amount) => { await addNetWorthItem(modalKind, name, amount); setModalKind(null); }}
        />
      ) : null}
    </div>
  );
}

function ItemRow({ item, onDelete }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span>{item.name}</span>
      <span className="tabular-nums flex items-center gap-2">{fmtINR(item.amount)} <button className="btn btn-ghost btn-sm" onClick={onDelete}>✕</button></span>
    </div>
  );
}

function AddNWModal({ kind, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const isAsset = kind === 'asset';
  return (
    <Modal title={isAsset ? 'Add asset' : 'Add liability'} onClose={onClose} onConfirm={() => name.trim() && amount && onAdd(name.trim(), parseFloat(amount))} confirmLabel="Save">
      <Field label="Name"><input className="field-input" placeholder={isAsset ? 'e.g. Savings account' : 'e.g. Education loan'} value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field label="Amount (₹)"><input type="number" className="field-input" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
    </Modal>
  );
}
