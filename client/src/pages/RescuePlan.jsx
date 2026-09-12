import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { cashFlowForecast, financialHealth, whatIfSavings, detectRecurring, sum, realExpenses, categoryBreakdown } from '../lib/analysis.js';
import { fmtINR } from '../lib/format.js';

export default function RescuePlan() {
  const { transactions, budgets, goals, netWorth, loading } = useData();
  const [reduction, setReduction] = useState(3000);
  const forecast = useMemo(() => cashFlowForecast(transactions, 3), [transactions]);
  const health = useMemo(() => financialHealth(transactions, budgets, goals, netWorth), [transactions, budgets, goals, netWorth]);
  const scenario = useMemo(() => whatIfSavings(transactions, reduction), [transactions, reduction]);
  const recurring = useMemo(() => detectRecurring(transactions), [transactions]);
  const categories = useMemo(() => categoryBreakdown(transactions), [transactions]);

  if (loading) return <div className="text-muted">Loading…</div>;

  if (!transactions.length) return (
    <div>
      <Header />
      <div className="empty-state">
        <h4 className="text-text text-[15px] font-bold mb-1.5">Your rescue plan needs data</h4>
        <p className="text-sm mb-4">Import a statement first. Money Rescue will use your spending history to build a forecast, health score and savings scenarios.</p>
        <Link to="/upload" className="btn btn-primary">Upload a statement</Link>
      </div>
    </div>
  );

  const scoreLabel = health.score >= 80 ? 'Strong' : health.score >= 60 ? 'Stable' : health.score >= 40 ? 'Needs attention' : 'At risk';
  const topDiscretionary = categories.filter(c => ['Food', 'Entertainment', 'Shopping', 'Subscriptions'].includes(c.category)).slice(0, 3);
  const projectedNet = (forecast.income || 0) - (forecast.expense || 0);

  return (
    <div>
      <Header />

      <div className="grid md:grid-cols-[1.25fr_.75fr] gap-4 mb-6">
        <div className="card">
          <div className="card-title">Your Rescue Plan</div>
          <div className="flex items-end gap-3 mb-2">
            <div className="text-4xl font-bold tracking-tight">{Math.round(health.score)}</div>
            <div className="pb-1.5 text-sm text-muted">/ 100 · {scoreLabel}</div>
          </div>
          <p className="text-sm text-muted max-w-2xl">A practical score based on savings rate, spending pressure, budget adherence, recurring commitments and goal progress. It is a planning signal, not financial advice.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
            <MiniStat label="Avg. monthly income" value={forecast.income !== null ? fmtINR(forecast.income) : '—'} />
            <MiniStat label="Avg. monthly spending" value={forecast.expense !== null ? fmtINR(forecast.expense) : '—'} />
            <MiniStat label="Expected monthly surplus" value={projectedNet >= 0 ? fmtINR(projectedNet) : `-${fmtINR(Math.abs(projectedNet))}`} bad={projectedNet < 0} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Health Breakdown</div>
          <div className="space-y-3">
            {health.factors.map(f => (
              <div key={f.label}>
                <div className="flex justify-between text-xs mb-1.5"><span className="text-muted">{f.label}</span><span className={f.good ? 'text-good font-semibold' : 'text-text font-semibold'}>{f.value === null ? 'No data' : `${Math.round(f.value)}%`}</span></div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(4, Math.min(100, f.score / f.max * 100))}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <section className="card">
          <div className="card-title">3-Month Cash-Flow Outlook</div>
          <p className="text-sm text-muted mb-4">Uses your recent monthly averages to show the expected direction of cash flow. It does not assume a starting bank balance.</p>
          <div className="space-y-2">
            {forecast.forecast.map(f => (
              <div key={f.month} className="flex items-center justify-between rounded-lg bg-bgElevated px-3.5 py-3">
                <span className="text-sm font-semibold">Month {f.month}</span>
                <div className="text-right"><div className="text-sm">{fmtINR(f.income)} in · {fmtINR(f.expense)} out</div><div className={`text-xs font-semibold ${f.net >= 0 ? 'text-good' : 'text-bad'}`}>{f.net >= 0 ? '+' : '−'}{fmtINR(Math.abs(f.net))} net</div></div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-title">What If You Cut Spending?</div>
          <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted">Monthly reduction</span><span className="text-lg font-bold">{fmtINR(reduction)}</span></div>
          <input type="range" min="0" max="20000" step="500" value={reduction} onChange={e => setReduction(Number(e.target.value))} className="w-full accent-accent mb-5" />
          {scenario ? (
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Current savings" value={fmtINR(scenario.currentSavings)} />
              <MiniStat label="New monthly savings" value={fmtINR(scenario.newSavings)} />
              <MiniStat label="Annual improvement" value={fmtINR(scenario.annualImprovement)} good />
              <MiniStat label="New savings rate" value={`${scenario.newRate.toFixed(0)}%`} good />
            </div>
          ) : <p className="text-sm text-muted">Add income data to simulate a savings scenario.</p>}
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card">
          <div className="card-title">Recurring Commitments</div>
          {recurring.length ? <>
            <div className="text-2xl font-bold mb-1">{fmtINR(sum(recurring, r => r.monthlyCost))}<span className="text-sm text-muted font-normal"> / month</span></div>
            <p className="text-xs text-muted mb-4">{fmtINR(sum(recurring, r => r.monthlyCost) * 12)} annualized across {recurring.length} detected recurring payments.</p>
            <div className="space-y-2">{recurring.slice(0, 5).map(r => <div key={`${r.merchant}-${r.category}`} className="flex justify-between text-sm"><span className="truncate mr-4">{r.merchant}</span><span className="font-semibold shrink-0">{fmtINR(r.monthlyCost)}/mo</span></div>)}</div>
            <Link to="/recurring" className="btn btn-sm mt-4">Review recurring expenses</Link>
          </> : <p className="text-sm text-muted">No recurring pattern detected yet.</p>}
        </section>

        <section className="card">
          <div className="card-title">Where To Look First</div>
          {topDiscretionary.length ? <div className="space-y-3">{topDiscretionary.map((c, i) => <div key={c.category} className="flex items-center gap-3"><div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">{i + 1}</div><div className="flex-1"><div className="text-sm font-semibold">{c.category}</div><div className="text-xs text-muted">{c.count} transactions · {c.pct.toFixed(0)}% of tracked spending</div></div><div className="font-semibold text-sm">{fmtINR(c.total)}</div></div>)}</div> : <p className="text-sm text-muted">Your discretionary categories need more data before a useful priority can be identified.</p>}
          <Link to="/leaks" className="btn btn-sm mt-4">See money leaks</Link>
        </section>
      </div>
    </div>
  );
}

function Header() {
  return <div className="flex items-center justify-between mb-6 flex-wrap gap-3"><div><div className="text-[22px] font-bold tracking-tight">Money Rescue Plan</div><div className="text-muted text-[13px] mt-0.5">Turn your transaction history into concrete next steps.</div></div><Link to="/upload" className="btn btn-primary">+ Add statement</Link></div>;
}

function MiniStat({ label, value, good, bad }) {
  return <div className="rounded-lg bg-bgElevated p-3"><div className="text-[10.5px] uppercase tracking-wide text-muted2 font-semibold">{label}</div><div className={`text-[15px] font-bold mt-1 ${good ? 'text-good' : bad ? 'text-bad' : ''}`}>{value}</div></div>;
}
