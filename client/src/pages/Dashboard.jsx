import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import StatCard from '../components/StatCard.jsx';
import { DonutChart, GroupedBarChart } from '../components/Charts.jsx';
import { fmtINR } from '../lib/format.js';
import {
  realExpenses, realIncome, sum, categoryBreakdown, merchantBreakdown,
  monthlySeries, estimateMonthlyIncome, estimateMonthlyExpense, detectRecurring,
} from '../lib/analysis.js';

const PALETTE = ['#8B6CFF', '#5CE1C6', '#F5B84F', '#FF6B7A', '#7FA9FF', '#E28CFF', '#4ADE9A', '#FFB3C6', '#A0A0D0', '#6FE0C0', '#D0A0FF'];

export default function Dashboard() {
  const { transactions, netWorth, loading } = useData();

  if (loading) return <div className="text-muted">Loading…</div>;

  if (!transactions.length) {
    return (
      <div>
        <Header />
        <div className="empty-state">
          <h4 className="text-text text-[15px] font-bold mb-1.5">No spending data yet</h4>
          <p className="text-sm mb-4">Upload your bank statement to discover where your money is going.</p>
          <Link to="/upload" className="btn btn-primary">Upload your spending data</Link>
          <Link to="/transactions" className="btn ml-2">Enter transactions manually</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <StatCard label="Total Spending" value="₹0" />
          <StatCard label="Transactions" value="0" />
          <StatCard label="Avg. Daily Spending" value="₹0" />
          <StatCard label="Top Category" value="None" />
        </div>
      </div>
    );
  }

  const exp = realExpenses(transactions);
  const inc = realIncome(transactions);
  const totalSpend = sum(exp, t => t.amount);
  const totalIncome = sum(inc, t => t.amount);
  const monthlyIncome = estimateMonthlyIncome(transactions);
  const monthlyExpense = estimateMonthlyExpense(transactions);
  const savings = (monthlyIncome !== null && monthlyExpense !== null) ? monthlyIncome - monthlyExpense : null;
  const savingsRate = (savings !== null && monthlyIncome) ? (savings / monthlyIncome * 100) : null;

  const dates = exp.map(t => t.date).filter(Boolean).sort();
  const dateSpan = dates.length ? Math.max(1, Math.round((new Date(dates[dates.length - 1]) - new Date(dates[0])) / 86400000) + 1) : 1;
  const avgDaily = totalSpend / dateSpan;

  const cats = categoryBreakdown(transactions);
  const merchants = merchantBreakdown(transactions);
  const topCat = cats[0];
  const topMerchant = merchants[0];

  const hasNW = netWorth.assets.length || netWorth.liabilities.length;
  const nwTotal = hasNW ? sum(netWorth.assets, a => a.amount) - sum(netWorth.liabilities, l => l.amount) : null;

  const series = monthlySeries(transactions).slice(-6);
  const cur = series[series.length - 1], prev = series[series.length - 2];
  const insights = [];
  if (cur && prev && prev.expense > 0) {
    const chg = ((cur.expense - prev.expense) / prev.expense * 100);
    insights.push(`Spending is ${Math.abs(chg).toFixed(0)}% ${chg < 0 ? 'lower' : 'higher'} than last month.`);
  }
  if (topCat) insights.push(`${topCat.category} is your largest spending category at ${fmtINR(topCat.total)}.`);
  const recurring = detectRecurring(transactions);
  if (recurring.length) insights.push(`${recurring.length} recurring payment${recurring.length > 1 ? 's' : ''} detected, totalling ${fmtINR(sum(recurring, r => r.monthlyCost))}/month.`);

  return (
    <div>
      <Header />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Spending" value={fmtINR(totalSpend)} sub={`${exp.length} transactions`} />
        <StatCard label="Income" value={fmtINR(totalIncome)} sub={`${inc.length} transactions`} />
        <StatCard label="Savings Rate" value={savingsRate !== null ? savingsRate.toFixed(0) + '%' : '—'} sub={savings !== null ? `Est. ${fmtINR(savings)}/mo saved` : 'Needs income data'} />
        <StatCard label="Avg. Daily Spending" value={fmtINR(avgDaily)} sub={`Over ${dateSpan} days`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Top Category" value={topCat ? topCat.category : 'None'} sub={topCat ? fmtINR(topCat.total) : ''} />
        <StatCard label="Top Merchant" value={topMerchant ? topMerchant.merchant : 'None'} sub={topMerchant ? fmtINR(topMerchant.total) : ''} />
        <StatCard label="Net Cash Flow" value={fmtINR(totalIncome - totalSpend)} sub="All-time tracked" />
        <StatCard label="Net Worth" value={nwTotal !== null ? fmtINR(nwTotal) : 'Not set up'} sub={nwTotal === null ? 'Add assets in Net Worth' : ''} />
      </div>

      {insights.length ? (
        <div className="card mb-6">
          <div className="card-title">Your Money This Month</div>
          {insights.map((i, idx) => <div key={idx} className="py-1 text-[13.5px]">• {i}</div>)}
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="card-title">Spending Distribution</div>
          {cats.length ? <DonutChart labels={cats.map(c => c.category)} data={cats.map(c => c.total)} /> : <div className="empty-state py-5"><p>Not enough data for a chart yet.</p></div>}
        </div>
        <div className="card">
          <div className="card-title">Monthly Spending vs Income</div>
          {series.length > 1 ? (
            <GroupedBarChart
              labels={series.map(s => monthLabel(s.month))}
              datasets={[
                { label: 'Spending', data: series.map(s => s.expense), backgroundColor: '#8B6CFF' },
                { label: 'Income', data: series.map(s => s.income), backgroundColor: '#5CE1C6' },
              ]}
            />
          ) : <div className="empty-state py-5"><p>Import more than one month of data to see trends.</p></div>}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Money Map</div>
        <MoneyMap cats={cats} income={totalIncome} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <div className="text-[22px] font-bold tracking-tight">Dashboard</div>
        <div className="text-muted text-[13px] mt-0.5">Your money, at a glance.</div>
      </div>
      <div className="flex gap-2"><Link to="/rescue" className="btn">View rescue plan</Link><Link to="/upload" className="btn btn-primary">+ Add statement</Link></div>
    </div>
  );
}

function monthLabel(mk) {
  const [y, m] = mk.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
}

function MoneyMap({ cats, income }) {
  if (!cats.length) return <div className="empty-state py-5"><p>Money Map will appear once you have categorized transactions.</p></div>;
  const max = Math.max(income || 0, sum(cats, c => c.total));
  return (
    <div>
      {income ? <MapRow label="Income" value={income} pct={income / max * 100} color="#4ADE9A" /> : null}
      {cats.map((c, i) => (
        <MapRow key={c.category} label={c.category} value={c.total} pct={c.total / max * 100} color={PALETTE[i % PALETTE.length]} />
      ))}
    </div>
  );
}
function MapRow({ label, value, pct, color }) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <div className="w-[120px] text-[12.5px] text-muted shrink-0">{label}</div>
      <div className="flex-1 h-[22px] rounded-md bg-bgElevated overflow-hidden">
        <div className="h-full rounded-md" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-[90px] text-right text-[12.5px] font-semibold shrink-0">{fmtINR(value)}</div>
    </div>
  );
}
