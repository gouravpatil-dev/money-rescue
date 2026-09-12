import React, { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { fmtINR, monthKey, todayISO } from '../lib/format.js';
import Modal, { Field } from '../components/Modal.jsx';

export default function Budgets() {
  const { transactions, categories, budgets, overallBudget, setCategoryBudget, removeCategoryBudget, setOverallBudgetValue, loading } = useData();
  const [showOverall, setShowOverall] = useState(false);

  if (loading) return <div className="text-muted">Loading…</div>;

  const thisMonth = transactions.filter(t =>
    t.date && monthKey(t.date) === monthKey(todayISO()) && t.type === 'debit' && !['transfer', 'atm', 'refund', 'investment'].includes(t.flag)
  );
  const spentByCat = {};
  thisMonth.forEach(t => { spentByCat[t.category] = (spentByCat[t.category] || 0) + t.amount; });
  const overallSpent = Object.values(spentByCat).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[22px] font-bold tracking-tight">Budgets</div>
          <div className="text-muted text-[13px] mt-0.5">Optional monthly limits for this calendar month.</div>
        </div>
        <button className="btn" onClick={() => setShowOverall(true)}>Set overall monthly budget</button>
      </div>

      {overallBudget ? (
        <div className="card mb-6">
          <div className="card-title">Overall Monthly Budget</div>
          <div className="flex justify-between text-[13px] mb-1.5"><span>{fmtINR(overallSpent)} spent</span><span>{fmtINR(overallBudget)} budget</span></div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, overallSpent / overallBudget * 100)}%`, background: overallSpent > overallBudget ? '#FF6B7A' : undefined }} /></div>
          <div className="text-xs text-muted2 mt-1.5">
            {overallSpent > overallBudget
              ? `You are ${fmtINR(overallSpent - overallBudget)} over your overall budget this month.`
              : `${(overallSpent / overallBudget * 100).toFixed(0)}% of your overall budget used.`}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="text-[15px] font-bold mb-3">Category Budgets</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {categories.map(c => (
            <CategoryBudgetCard
              key={c}
              category={c}
              limit={budgets[c]}
              spent={spentByCat[c] || 0}
              onSet={(v) => setCategoryBudget(c, v)}
              onRemove={() => removeCategoryBudget(c)}
            />
          ))}
        </div>
      </div>

      {showOverall ? (
        <Modal title="Overall monthly budget" onClose={() => setShowOverall(false)} onConfirm={() => setShowOverall(false)} confirmLabel="Save">
          <OverallBudgetForm initial={overallBudget} onChange={setOverallBudgetValue} />
        </Modal>
      ) : null}
    </div>
  );
}

function CategoryBudgetCard({ category, limit, spent, onSet, onRemove }) {
  const [draft, setDraft] = useState('');
  if (!limit) {
    return (
      <div className="card">
        <div className="card-title">{category}</div>
        <div className="text-xs text-muted2 mb-2.5">No budget set</div>
        <input
          type="number" className="field-input" placeholder="Set monthly limit"
          value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={() => { const v = parseFloat(draft); if (v > 0) { onSet(v); setDraft(''); } }}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
        />
      </div>
    );
  }
  const pct = spent / limit * 100;
  return (
    <div className="card">
      <div className="card-title">{category}</div>
      <div className="flex justify-between text-[13px] mb-1.5"><span>{fmtINR(spent)}</span><span>{fmtINR(limit)}</span></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 100 ? '#FF6B7A' : pct >= 75 ? '#F5B84F' : undefined }} /></div>
      <div className="text-xs text-muted2 mt-1.5">{pct >= 100 ? `${fmtINR(spent - limit)} over budget` : `${pct.toFixed(0)}% used`}</div>
      <button className="btn btn-ghost btn-sm mt-2" onClick={onRemove}>Remove budget</button>
    </div>
  );
}

function OverallBudgetForm({ initial, onChange }) {
  const [val, setVal] = useState(initial || '');
  return (
    <Field label="Monthly spending limit (₹)">
      <input className="field-input" type="number" value={val} onChange={e => { setVal(e.target.value); onChange(parseFloat(e.target.value) || null); }} />
    </Field>
  );
}
