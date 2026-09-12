import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { fmtINR, fmtINR2 } from '../lib/format.js';
import { GroupedBarChart, TrendLineChart } from '../components/Charts.jsx';
import { ConfBadge } from './Transactions.jsx';
import {
  periodTxns, categoryBreakdown, merchantBreakdown, realExpenses, realIncome, sum,
} from '../lib/analysis.js';

const RANGES = [['1m', '1 month'], ['3m', '3 months'], ['6m', '6 months'], ['1y', '1 year'], ['all', 'All time']];

export default function Analysis() {
  const { transactions, categories, changeCategoryWithMemory, loading } = useData();
  const [range, setRange] = useState('3m');

  if (loading) return <div className="text-muted">Loading…</div>;

  if (!transactions.length) {
    return (
      <div>
        <div className="text-[22px] font-bold tracking-tight mb-6">Analysis</div>
        <div className="empty-state">
          <h4 className="text-text text-[15px] font-bold mb-1.5">No data to analyze yet</h4>
          <p className="text-sm mb-4">Upload a statement to see category, merchant and trend analysis.</p>
          <Link to="/upload" className="btn btn-primary">Upload statement</Link>
        </div>
      </div>
    );
  }

  const txns = periodTxns(transactions, range);
  const cats = categoryBreakdown(txns);
  const merchants = merchantBreakdown(txns).slice(0, 10);
  const exp = realExpenses(txns);
  const total = sum(exp, t => t.amount);
  const inc = realIncome(txns);
  const totalInc = sum(inc, t => t.amount);

  const byDay = {};
  exp.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.amount; });
  const days = Object.keys(byDay).sort();

  const lowConf = transactions.filter(t => t.confidence < 70);

  return (
    <div>
      <div className="mb-6">
        <div className="text-[22px] font-bold tracking-tight">Analysis</div>
        <div className="text-muted text-[13px] mt-0.5">Spending, categories, merchants and trends.</div>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {RANGES.map(([v, l]) => (
          <div key={v} onClick={() => setRange(v)} className={`px-3 py-1.5 rounded-full border text-[12.5px] cursor-pointer ${range === v ? 'bg-accent/10 border-accent text-accent font-semibold' : 'border-border text-muted'}`}>{l}</div>
        ))}
      </div>

      <div className="card mb-6">
        <div className="card-title">Summary</div>
        <p className="text-sm leading-relaxed">
          You spent <strong>{fmtINR(total)}</strong> across <strong>{exp.length}</strong> transactions in this period.
          {cats[0] ? <> <strong>{cats[0].category}</strong> was your largest category at {fmtINR(cats[0].total)} ({cats[0].pct.toFixed(0)}%).</> : null}
          {totalInc ? <> You received {fmtINR(totalInc)} in income over the same period.</> : null}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="card-title">Category Breakdown</div>
          {cats.length ? (
            <GroupedBarChart labels={cats.map(c => c.category)} datasets={[{ data: cats.map(c => c.total), backgroundColor: '#8B6CFF' }]} horizontal height={240} />
          ) : <div className="empty-state py-4"><p>No categorized spending in this period.</p></div>}
        </div>
        <div className="card">
          <div className="card-title">Daily Spending Trend</div>
          {days.length ? <TrendLineChart labels={days} data={days.map(d => byDay[d])} height={240} /> : <div className="empty-state py-4"><p>No spending data in this period.</p></div>}
        </div>
      </div>

      <Section title="Category Detail">
        <div className="card overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr className="text-left">
              {['Category', 'Total', '%', 'Transactions', 'Avg'].map((h, i) => (
                <th key={h} className={`text-muted font-semibold text-[11.5px] uppercase tracking-wide py-2.5 px-2.5 border-b border-border ${i > 0 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {cats.map(c => (
                <tr key={c.category} className="border-b border-border">
                  <td className="py-2.5 px-2.5">{c.category}</td>
                  <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtINR(c.total)}</td>
                  <td className="py-2.5 px-2.5 text-right">{c.pct.toFixed(1)}%</td>
                  <td className="py-2.5 px-2.5 text-right">{c.count}</td>
                  <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtINR(c.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Merchant Analysis" hint="Top 10 by total spend">
        <div className="card overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr className="text-left">
              {['Merchant', 'Total', 'Transactions', 'Avg', 'Largest', 'First', 'Last'].map((h, i) => (
                <th key={h} className={`text-muted font-semibold text-[11.5px] uppercase tracking-wide py-2.5 px-2.5 border-b border-border ${i > 0 && i < 5 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {merchants.map(m => (
                <tr key={m.merchant} className="border-b border-border">
                  <td className="py-2.5 px-2.5">{m.merchant}</td>
                  <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtINR(m.total)}</td>
                  <td className="py-2.5 px-2.5 text-right">{m.count}</td>
                  <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtINR(m.avg)}</td>
                  <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtINR(m.max)}</td>
                  <td className="py-2.5 px-2.5">{m.first}</td>
                  <td className="py-2.5 px-2.5">{m.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Category Clarification" hint="Low-confidence classifications needing your review">
        {!lowConf.length ? (
          <div className="text-xs text-muted2 card">All transactions are confidently categorized. Nice.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead><tr className="text-left">
                {['Date', 'Description', 'Amount', 'Current', 'Confidence', ''].map(h => (
                  <th key={h} className="text-muted font-semibold text-[11.5px] uppercase tracking-wide py-2.5 px-2.5 border-b border-border">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {lowConf.slice(0, 50).map(t => (
                  <tr key={t.id} className="border-b border-border">
                    <td className="py-2.5 px-2.5 tabular-nums">{t.date}</td>
                    <td className="py-2.5 px-2.5">{(t.description || '').slice(0, 40)}</td>
                    <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtINR2(t.amount)}</td>
                    <td className="py-2.5 px-2.5">
                      <select className="field-input" value={t.category} onChange={e => changeCategoryWithMemory(t, e.target.value)}>
                        {categories.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="py-2.5 px-2.5"><ConfBadge c={t.confidence} /></td>
                    <td className="py-2.5 px-2.5"><button className="btn btn-sm" onClick={() => changeCategoryWithMemory(t, t.category)}>Confirm</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-bold m-0">{title}</h3>
        {hint ? <span className="text-xs text-muted2">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
