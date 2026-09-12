import React from 'react';
import { useData } from '../context/DataContext.jsx';
import { fmtINR } from '../lib/format.js';
import { detectRecurring, sum, estimateMonthlyIncome } from '../lib/analysis.js';

export default function Recurring() {
  const { transactions, loading } = useData();
  if (loading) return <div className="text-muted">Loading…</div>;

  const recurring = detectRecurring(transactions);
  const monthlyTotal = sum(recurring, r => r.monthlyCost);
  const income = estimateMonthlyIncome(transactions);

  return (
    <div>
      <div className="mb-6">
        <div className="text-[22px] font-bold tracking-tight">Recurring Payments</div>
        <div className="text-muted text-[13px] mt-0.5">Subscriptions and repeating payments detected from your transaction history.</div>
      </div>

      {recurring.length ? (
        <>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="stat-card"><div className="stat-label">Monthly subscription cost</div><div className="stat-value">{fmtINR(monthlyTotal)}</div></div>
            <div className="stat-card"><div className="stat-label">Annual subscription cost</div><div className="stat-value">{fmtINR(monthlyTotal * 12)}</div></div>
            <div className="stat-card"><div className="stat-label">Burden vs income</div><div className="stat-value">{income ? (monthlyTotal / income * 100).toFixed(1) + '%' : '—'}</div></div>
          </div>
          <div className="card overflow-x-auto mb-4">
            <table className="w-full text-[13px] border-collapse">
              <thead><tr className="text-left">
                {['Merchant', 'Category', 'Monthly', 'Annual', 'Frequency', 'First seen', 'Last seen'].map((h, i) => (
                  <th key={h} className={`text-muted font-semibold text-[11.5px] uppercase tracking-wide py-2.5 px-2.5 border-b border-border ${i === 2 || i === 3 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {recurring.map((r, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-2.5 px-2.5">{r.merchant}</td>
                    <td className="py-2.5 px-2.5">{r.category}</td>
                    <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtINR(r.monthlyCost)}</td>
                    <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtINR(r.annualCost)}</td>
                    <td className="py-2.5 px-2.5">{r.frequency}</td>
                    <td className="py-2.5 px-2.5">{r.first}</td>
                    <td className="py-2.5 px-2.5">{r.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-muted2">This is a pattern-based detection using amount consistency and timing — it may miss irregular subscriptions or flag a coincidental repeat purchase. Review before assuming a payment is truly recurring.</div>
        </>
      ) : (
        <div className="empty-state">
          <h4 className="text-text text-[15px] font-bold mb-1.5">No recurring payments detected yet</h4>
          <p className="text-sm">Import a few months of statements so patterns can emerge.</p>
        </div>
      )}
    </div>
  );
}
