import React from 'react';
import { useData } from '../context/DataContext.jsx';
import { fmtINR, monthKey, monthLabel } from '../lib/format.js';
import { monthlySeries, categoryBreakdown } from '../lib/analysis.js';

export default function MonthlyReview() {
  const { transactions, loading } = useData();
  if (loading) return <div className="text-muted">Loading…</div>;

  const series = monthlySeries(transactions);
  if (series.length < 2) {
    return (
      <div>
        <div className="text-[22px] font-bold tracking-tight mb-6">Monthly Review</div>
        <div className="empty-state">
          <h4 className="text-text text-[15px] font-bold mb-1.5">Not enough history yet</h4>
          <p className="text-sm">Import at least two months of statements to see what changed month over month.</p>
        </div>
      </div>
    );
  }

  const cur = series[series.length - 1], prev = series[series.length - 2];
  const curTx = transactions.filter(t => monthKey(t.date) === cur.month);
  const prevTx = transactions.filter(t => monthKey(t.date) === prev.month);
  const curCats = categoryBreakdown(curTx);
  const prevCats = categoryBreakdown(prevTx);

  const allCats = new Set([...curCats.map(c => c.category), ...prevCats.map(c => c.category)]);
  const changes = [];
  allCats.forEach(cat => {
    const c = curCats.find(x => x.category === cat)?.total || 0;
    const p = prevCats.find(x => x.category === cat)?.total || 0;
    if (Math.abs(c - p) > 100) changes.push({ cat, diff: c - p });
  });
  changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const spendChangePct = prev.expense ? ((cur.expense - prev.expense) / prev.expense * 100) : 0;
  const savingsCur = cur.income - cur.expense, savingsPrev = prev.income - prev.expense;

  return (
    <div>
      <div className="mb-6">
        <div className="text-[22px] font-bold tracking-tight">Monthly Review</div>
        <div className="text-muted text-[13px] mt-0.5">{monthLabel(cur.month)} vs {monthLabel(prev.month)}</div>
      </div>

      <div className="card mb-4">
        <div className="card-title">What Changed?</div>
        <div className="text-sm leading-loose">
          <div>Spending {spendChangePct <= 0 ? '↓' : '↑'} <strong className={spendChangePct <= 0 ? 'text-good' : 'text-bad'}>{Math.abs(spendChangePct).toFixed(0)}%</strong> ({fmtINR(prev.expense)} → {fmtINR(cur.expense)})</div>
          <div>Savings {(savingsCur - savingsPrev) >= 0 ? '↑' : '↓'} <strong className={(savingsCur - savingsPrev) >= 0 ? 'text-good' : 'text-bad'}>{fmtINR(Math.abs(savingsCur - savingsPrev))}</strong></div>
          {changes.slice(0, 6).map((c, i) => (
            <div key={i}>{c.cat} {c.diff >= 0 ? '↑' : '↓'} <strong className={c.diff >= 0 ? 'text-bad' : 'text-good'}>{fmtINR(Math.abs(c.diff))}</strong></div>
          ))}
        </div>
      </div>
      <div className="text-xs text-muted2">Only changes supported by your actual imported data are shown here.</div>
    </div>
  );
}
