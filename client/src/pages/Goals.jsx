import React, { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { fmtINR } from '../lib/format.js';
import { estimateMonthlyIncome, estimateMonthlyExpense } from '../lib/analysis.js';
import Modal, { Field } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Goals() {
  const { transactions, goals, addGoal, updateGoal, deleteGoal, loading } = useData();
  const [showAdd, setShowAdd] = useState(false);
  const toast = useToast();

  if (loading) return <div className="text-muted">Loading…</div>;

  const income = estimateMonthlyIncome(transactions);
  const expense = estimateMonthlyExpense(transactions);
  const surplus = (income !== null && expense !== null) ? income - expense : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[22px] font-bold tracking-tight">Goals</div>
          <div className="text-muted text-[13px] mt-0.5">Set realistic savings targets and track progress.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ New goal</button>
      </div>

      {goals.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {goals.map(g => (
            <GoalCard key={g.id} g={g} surplus={surplus} onDelete={() => deleteGoal(g.id)} onContribute={(amt) => updateGoal(g.id, { current: (g.current || 0) + amt })} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h4 className="text-text text-[15px] font-bold mb-1.5">No goals yet</h4>
          <p className="text-sm">Create a financial goal to start tracking progress.</p>
        </div>
      )}

      {showAdd ? (
        <AddGoalModal
          onClose={() => setShowAdd(false)}
          onAdd={async (g) => {
            if (!g.name || !g.target) { toast('Please enter a goal name and target amount.'); return; }
            await addGoal(g);
            setShowAdd(false);
          }}
        />
      ) : null}
    </div>
  );
}

function GoalCard({ g, surplus, onDelete, onContribute }) {
  const [amt, setAmt] = useState('');
  const remaining = Math.max(0, g.target - g.current);
  const pct = g.target ? Math.min(100, g.current / g.target * 100) : 0;
  const monthsLeft = g.deadline ? Math.max(0.1, (new Date(g.deadline) - new Date()) / (1000 * 3600 * 24 * 30)) : null;
  const requiredMonthly = monthsLeft ? remaining / monthsLeft : null;
  const realistic = requiredMonthly !== null && surplus !== null ? requiredMonthly <= surplus : null;

  return (
    <div className="card">
      <div className="flex justify-between">
        <div className="font-bold">{g.name}</div>
        <button className="btn btn-ghost btn-sm" onClick={onDelete}>✕</button>
      </div>
      <div className="text-xl font-bold mt-2 mb-1">{fmtINR(g.current)} <span className="text-muted font-medium text-sm">/ {fmtINR(g.target)}</span></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
      <div className="text-xs text-muted2 mt-1.5">{pct.toFixed(0)}% complete · {fmtINR(remaining)} remaining{g.deadline ? ` · by ${g.deadline}` : ''}</div>
      {requiredMonthly !== null ? (
        <div className={`text-[12.5px] mt-2.5 ${realistic === false ? 'text-bad' : 'text-muted'}`}>
          Requires ~{fmtINR(requiredMonthly)}/month to hit your deadline.
          {realistic === false ? ` This is more than your estimated monthly surplus of ${fmtINR(surplus)} — consider extending the deadline or increasing income.` : ''}
        </div>
      ) : null}
      <div className="flex gap-2 mt-3">
        <input type="number" className="field-input flex-1" placeholder="Add contribution ₹" value={amt} onChange={e => setAmt(e.target.value)} />
        <button className="btn btn-sm" onClick={() => { const v = parseFloat(amt); if (v > 0) { onContribute(v); setAmt(''); } }}>Add</button>
      </div>
    </div>
  );
}

function AddGoalModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [deadline, setDeadline] = useState('');

  const submit = () => onAdd({
    name: name.trim(), target: parseFloat(target), current: parseFloat(current) || 0,
    deadline: deadline || null, priority: 'medium',
  });

  return (
    <Modal title="New goal" onClose={onClose} onConfirm={submit} confirmLabel="Create">
      <Field label="Goal name"><input className="field-input" placeholder="e.g. Laptop fund" value={name} onChange={e => setName(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Target amount (₹)"><input type="number" className="field-input" value={target} onChange={e => setTarget(e.target.value)} /></Field>
        <Field label="Current savings (₹)"><input type="number" className="field-input" value={current} onChange={e => setCurrent(e.target.value)} /></Field>
      </div>
      <Field label="Deadline (optional)"><input type="date" className="field-input" value={deadline} onChange={e => setDeadline(e.target.value)} /></Field>
    </Modal>
  );
}
