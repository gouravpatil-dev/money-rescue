export function fmtINR(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const neg = n < 0;
  n = Math.abs(n);
  const s = n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return (neg ? '-' : '') + '₹' + s;
}

export function fmtINR2(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const neg = n < 0;
  n = Math.abs(n);
  return (neg ? '-' : '') + '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(d) {
  return d ? d.slice(0, 7) : '';
}

export function monthLabel(mk) {
  const [y, m] = mk.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
}

export function uid(prefix = 'x') {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Escapes regex special characters so a merchant/description string can be safely
// used as a literal-match categorization rule pattern.
export function escapeRegex(str) {
  return (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
