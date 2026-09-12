import { monthKey } from './format.js';

export function sum(arr, f) {
  return arr.reduce((s, x) => s + (f ? f(x) : x), 0);
}

export function realExpenses(txns) {
  return txns.filter(t => t.type === 'debit' && !['transfer', 'atm', 'refund', 'investment'].includes(t.flag));
}
export function realIncome(txns) {
  return txns.filter(t => t.type === 'credit' && t.flag !== 'transfer' && t.flag !== 'refund');
}

export function periodTxns(all, range) {
  if (!all.length) return [];
  if (range === 'all') return all;
  const months = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }[range] || 3;
  const dates = all.map(t => t.date).filter(Boolean).sort();
  if (!dates.length) return all;
  const maxDate = new Date(dates[dates.length - 1]);
  const cutoff = new Date(maxDate);
  cutoff.setMonth(cutoff.getMonth() - months);
  return all.filter(t => t.date && new Date(t.date) >= cutoff);
}

export function categoryBreakdown(txns) {
  const exp = realExpenses(txns);
  const total = sum(exp, t => t.amount);
  const map = {};
  exp.forEach(t => {
    if (!map[t.category]) map[t.category] = { category: t.category, total: 0, count: 0 };
    map[t.category].total += t.amount;
    map[t.category].count++;
  });
  return Object.values(map)
    .map(c => Object.assign(c, { pct: total ? (c.total / total * 100) : 0, avg: c.total / c.count }))
    .sort((a, b) => b.total - a.total);
}

export function merchantBreakdown(txns) {
  const exp = realExpenses(txns);
  const map = {};
  exp.forEach(t => {
    const m = t.merchant || t.description || 'Unknown';
    if (!map[m]) map[m] = { merchant: m, total: 0, count: 0, first: t.date, last: t.date, max: 0 };
    map[m].total += t.amount;
    map[m].count++;
    if (t.date < map[m].first) map[m].first = t.date;
    if (t.date > map[m].last) map[m].last = t.date;
    if (t.amount > map[m].max) map[m].max = t.amount;
  });
  return Object.values(map).map(m => Object.assign(m, { avg: m.total / m.count })).sort((a, b) => b.total - a.total);
}

export function monthlySeries(txns) {
  const map = {};
  txns.forEach(t => {
    if (!t.date) return;
    const mk = monthKey(t.date);
    if (!map[mk]) map[mk] = { month: mk, expense: 0, income: 0 };
    if (t.type === 'debit' && !['transfer', 'atm', 'refund', 'investment'].includes(t.flag)) map[mk].expense += t.amount;
    if (t.type === 'credit' && t.flag !== 'transfer' && t.flag !== 'refund') map[mk].income += t.amount;
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

export function detectRecurring(transactions) {
  const exp = transactions.filter(t => t.type === 'debit');
  const byMerchant = {};
  exp.forEach(t => {
    const key = (t.merchant || t.description || '').toLowerCase().trim();
    if (!key) return;
    if (!byMerchant[key]) byMerchant[key] = [];
    byMerchant[key].push(t);
  });
  const recurring = [];
  Object.values(byMerchant).forEach(list => {
    if (list.length < 2) return;
    list.sort((a, b) => a.date.localeCompare(b.date));
    const amounts = list.map(t => t.amount);
    const avgAmt = sum(amounts) / amounts.length;
    const closeAmt = amounts.every(a => Math.abs(a - avgAmt) / avgAmt < 0.25);
    const gaps = [];
    for (let i = 1; i < list.length; i++) {
      const d1 = new Date(list[i - 1].date), d2 = new Date(list[i].date);
      gaps.push((d2 - d1) / (1000 * 3600 * 24));
    }
    const avgGap = gaps.length ? sum(gaps) / gaps.length : 0;
    const monthly = avgGap > 22 && avgGap < 40;
    if (closeAmt && (monthly || list.length >= 3)) {
      recurring.push({
        merchant: list[0].merchant || list[0].description,
        monthlyCost: avgAmt,
        annualCost: avgAmt * 12,
        occurrences: list.length,
        first: list[0].date,
        last: list[list.length - 1].date,
        category: list[list.length - 1].category,
        frequency: monthly ? 'Monthly' : 'Recurring',
      });
    }
  });
  return recurring.sort((a, b) => b.monthlyCost - a.monthlyCost);
}

export function estimateMonthlyIncome(transactions) {
  const inc = realIncome(transactions);
  if (!inc.length) return null;
  const series = {};
  inc.forEach(t => { const mk = monthKey(t.date); series[mk] = (series[mk] || 0) + t.amount; });
  const vals = Object.values(series);
  return vals.length ? sum(vals) / vals.length : null;
}

export function estimateMonthlyExpense(transactions) {
  const exp = realExpenses(transactions);
  if (!exp.length) return null;
  const series = {};
  exp.forEach(t => { const mk = monthKey(t.date); series[mk] = (series[mk] || 0) + t.amount; });
  const vals = Object.values(series);
  return vals.length ? sum(vals) / vals.length : null;
}

export function moneyLeakAnalysis(transactions) {
  const txns = periodTxns(transactions, '3m');
  const cats = categoryBreakdown(txns);
  const recurring = detectRecurring(transactions);
  const discretionary = ['Food', 'Entertainment', 'Shopping', 'Subscriptions'];
  const leaks = [];
  const scoreFactors = [];

  const subMonthly = sum(recurring, r => r.monthlyCost);
  const income = estimateMonthlyIncome(transactions);
  if (recurring.length) {
    const burden = income ? (subMonthly / income * 100) : null;
    leaks.push({
      title: 'Subscription & recurring payment burden',
      detail: `${recurring.length} recurring payment(s) detected totalling ₹${Math.round(subMonthly).toLocaleString('en-IN')}/month (₹${Math.round(subMonthly * 12).toLocaleString('en-IN')}/year).`,
      confidence: burden !== null && burden > 15 ? 'High Confidence' : 'Potential Leak',
      potentialSaving: subMonthly * 0.3,
      impact: subMonthly,
    });
    scoreFactors.push({ label: 'Recurring/subscription load', weight: Math.min(30, subMonthly / 500) });
  }
  cats.filter(c => discretionary.includes(c.category)).forEach(c => {
    if (c.total > 0) {
      leaks.push({
        title: `${c.category} spending`,
        detail: `₹${Math.round(c.total).toLocaleString('en-IN')} spent on ${c.category} across ${c.count} transactions over the last 3 months (${c.pct.toFixed(0)}% of tracked spending).`,
        confidence: c.pct > 25 ? 'High Confidence' : (c.pct > 12 ? 'Potential Leak' : 'Behavioral Pattern'),
        potentialSaving: c.total * 0.15,
        impact: c.total,
      });
      scoreFactors.push({ label: `${c.category} share of spending`, weight: Math.min(20, c.pct / 2) });
    }
  });
  const smallFreq = txns.filter(t => t.type === 'debit' && t.amount > 0 && t.amount < 300 && !['transfer', 'atm'].includes(t.flag));
  if (smallFreq.length > 15) {
    const totalSmall = sum(smallFreq, t => t.amount);
    leaks.push({
      title: 'Frequent small purchases',
      detail: `${smallFreq.length} transactions under ₹300 totalling ₹${Math.round(totalSmall).toLocaleString('en-IN')} in the last 3 months. These add up even though each purchase looks small.`,
      confidence: 'Behavioral Pattern',
      potentialSaving: totalSmall * 0.2,
      impact: totalSmall,
    });
    scoreFactors.push({ label: 'Frequent small purchases', weight: Math.min(15, smallFreq.length / 4) });
  }
  leaks.sort((a, b) => b.impact - a.impact);
  const score = Math.round(Math.min(100, sum(scoreFactors, f => f.weight)));
  return { leaks, score, scoreFactors, recurring };
}


export function monthlyAverages(transactions, months = 6) {
  const series = monthlySeries(transactions);
  const recent = series.slice(-months);
  if (!recent.length) return { income: null, expense: null, savings: null, months: 0, series: [] };
  const income = sum(recent, m => m.income) / recent.length;
  const expense = sum(recent, m => m.expense) / recent.length;
  return { income, expense, savings: income - expense, months: recent.length, series: recent };
}

export function cashFlowForecast(transactions, months = 3) {
  const avg = monthlyAverages(transactions, 6);
  if (avg.income === null && avg.expense === null) return { ...avg, forecast: [] };
  const forecast = Array.from({ length: months }, (_, i) => ({
    month: i + 1,
    income: avg.income || 0,
    expense: avg.expense || 0,
    net: (avg.income || 0) - (avg.expense || 0),
  }));
  return { ...avg, forecast };
}

export function financialHealth(transactions, budgets = {}, goals = [], netWorth = {}) {
  const avg = monthlyAverages(transactions, 6);
  const income = avg.income || 0;
  const expense = avg.expense || 0;
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : null;
  const cats = categoryBreakdown(transactions);
  const budgetEntries = Object.entries(budgets || {});
  const budgetChecks = budgetEntries.map(([category, limit]) => {
    const spend = cats.find(c => c.category === category)?.total || 0;
    return { category, limit, spend };
  });
  const budgetScore = budgetChecks.length
    ? Math.round((budgetChecks.filter(b => b.spend <= b.limit).length / budgetChecks.length) * 20)
    : 10;

  const recurring = detectRecurring(transactions);
  const recurringCost = sum(recurring, r => r.monthlyCost);
  const recurringBurden = income > 0 ? (recurringCost / income) * 100 : 0;
  const goalProgress = goals.length
    ? sum(goals, g => g.target > 0 ? Math.min(1, (g.current || 0) / g.target) : 0) / goals.length
    : null;

  const savingsScore = savingsRate === null ? 8 : Math.max(0, Math.min(35, savingsRate * 0.7));
  const spendingScore = income > 0 ? Math.max(0, Math.min(20, (1 - Math.min(1.2, expense / income)) * 20)) : 8;
  const recurringScore = Math.max(0, 15 - Math.min(15, recurringBurden * 0.6));
  const goalScore = goalProgress === null ? 5 : goalProgress * 10;
  const score = Math.round(Math.max(0, Math.min(100, savingsScore + spendingScore + budgetScore + recurringScore + goalScore)));

  const factors = [
    { label: 'Savings rate', value: savingsRate === null ? null : savingsRate, score: savingsScore, max: 35, good: savingsRate === null ? false : savingsRate >= 20 },
    { label: 'Spending vs income', value: income ? (expense / income) * 100 : null, score: spendingScore, max: 20, good: income > 0 && expense <= income * 0.8 },
    { label: 'Budget adherence', value: budgetChecks.length ? (budgetScore / 20) * 100 : null, score: budgetScore, max: 20, good: budgetScore >= 16 },
    { label: 'Recurring commitments', value: recurringBurden, score: recurringScore, max: 15, good: recurringBurden <= 15 },
    { label: 'Goal progress', value: goalProgress === null ? null : goalProgress * 100, score: goalScore, max: 10, good: goalProgress === null ? false : goalProgress >= 0.5 },
  ];
  return { score, savingsRate, recurringBurden, factors, average: avg };
}

export function whatIfSavings(transactions, monthlyReduction) {
  const avg = monthlyAverages(transactions, 6);
  if (avg.income === null) return null;
  const reduction = Math.max(0, Number(monthlyReduction) || 0);
  const currentSavings = avg.savings || 0;
  const newSavings = currentSavings + reduction;
  const annualImprovement = reduction * 12;
  const newRate = avg.income ? (newSavings / avg.income) * 100 : null;
  return { currentSavings, newSavings, annualImprovement, newRate, income: avg.income, expense: avg.expense };
}
