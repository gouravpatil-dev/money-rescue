import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { fmtINR } from '../lib/format.js';
import { estimateMonthlyIncome, estimateMonthlyExpense, moneyLeakAnalysis, sum } from '../lib/analysis.js';

export default function Reports() {
  const { transactions, goals, loading } = useData();
  if (loading) return <div className="text-muted">Loading…</div>;

  if (!transactions.length) {
    return (
      <div>
        <div className="text-[22px] font-bold tracking-tight mb-6">Reports</div>
        <div className="empty-state">
          <h4 className="text-text text-[15px] font-bold mb-1.5">No data yet</h4>
          <p className="text-sm mb-4">Upload a statement to generate your Money Rescue Plan.</p>
          <Link to="/upload" className="btn btn-primary">Upload statement</Link>
        </div>
      </div>
    );
  }

  const income = estimateMonthlyIncome(transactions);
  const expense = estimateMonthlyExpense(transactions);
  const savings = (income !== null && expense !== null) ? income - expense : null;
  const savingsRate = (savings !== null && income) ? savings / income * 100 : null;
  const { leaks } = moneyLeakAnalysis(transactions);
  const top3 = leaks.slice(0, 3);
  const potentialTotal = sum(top3, l => l.potentialSaving);
  const goal = goals[0];

  const downloadReport = () => {
    const text = document.getElementById('report-content')?.innerText || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'money-rescue-plan.txt'; a.click();
  };

  return (
    <div id="report-content">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[22px] font-bold tracking-tight">Money Rescue Plan</div>
          <div className="text-muted text-[13px] mt-0.5">Your personalized report, generated from actual spending behavior.</div>
        </div>
        <button className="btn" onClick={downloadReport}>Download as text</button>
      </div>

      <div className="card mb-4">
        <div className="card-title">Current Situation</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><div className="stat-label">Monthly income</div><div className="text-lg font-bold">{income ? fmtINR(income) : 'Unknown'}</div></div>
          <div><div className="stat-label">Avg. monthly spending</div><div className="text-lg font-bold">{expense ? fmtINR(expense) : 'Unknown'}</div></div>
          <div><div className="stat-label">Estimated savings</div><div className="text-lg font-bold">{savings !== null ? fmtINR(savings) : 'Unknown'}</div></div>
          <div><div className="stat-label">Savings rate</div><div className="text-lg font-bold">{savingsRate !== null ? savingsRate.toFixed(0) + '%' : 'Unknown'}</div></div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-title">Biggest Potential Money Leaks</div>
        {top3.length ? top3.map((l, i) => (
          <div key={i} className="py-2 border-b border-border last:border-0">
            <strong>{i + 1}. {l.title}</strong> — potentially reduce by {fmtINR(l.potentialSaving)}/quarter
          </div>
        )) : <div className="text-xs text-muted2">No major leaks identified.</div>}
      </div>

      <div className="card mb-4">
        <div className="card-title">Monthly Rescue Target</div>
        <p className="text-[13.5px]">
          Current savings: <strong>{savings !== null ? fmtINR(savings) : 'Unknown'}</strong>. If you act on the leaks above, you could potentially add roughly{' '}
          <strong className="text-good">{fmtINR(potentialTotal / 3)}</strong> more per month — treat this as a rough, non-guaranteed estimate.
        </p>
      </div>

      {goal ? (
        <div className="card mb-4">
          <div className="card-title">Goal: {goal.name}</div>
          <p className="text-[13.5px]">Target {fmtINR(goal.target)}{goal.deadline ? `, deadline ${goal.deadline}` : ''}. Currently at {fmtINR(goal.current)}.</p>
        </div>
      ) : null}

      <div className="card">
        <div className="card-title">Action Plan</div>
        <div className="text-[13.5px] leading-loose">
          <div><strong>Week 1</strong> — Review recurring payments and cancel anything unused.</div>
          <div><strong>Week 2</strong> — Set a budget for your top discretionary category and track it.</div>
          <div><strong>Week 3</strong> — Review actual spending against that budget.</div>
          <div><strong>Week 4</strong> — Adjust next month's targets based on what worked.</div>
        </div>
      </div>
    </div>
  );
}
