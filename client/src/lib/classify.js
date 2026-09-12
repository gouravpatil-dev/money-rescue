export const DEFAULT_CATEGORIES = ['Food','Entertainment','Bills','Shopping','Transport','Healthcare','Education','Travel','Subscriptions','Investments','Other'];

const TRANSFER_HINTS = /\bneft|imps|rtgs|self transfer|own account|fund transfer|a\/c transfer\b/i;
const ATM_HINTS = /\batm\b|cash wdl|cash withdrawal/i;
const REFUND_HINTS = /refund|reversal|chargeback|cashback|reversed/i;
const INCOME_HINTS = /salary|stipend|payroll|freelance payment|consulting fee/i;

export function classify(desc, merchant, rules) {
  const hay = ((desc || '') + ' ' + (merchant || '')).toLowerCase();
  let best = null;
  for (const r of rules) {
    if (!r.enabled) continue;
    let re;
    try { re = new RegExp(r.pattern, 'i'); } catch (e) { continue; }
    if (r.pattern && re.test(hay)) {
      if (!best || r.priority > best.priority) best = r;
    }
  }
  if (best) return { category: best.category, confidence: Math.min(98, 90 + best.priority) };
  return { category: 'Other', confidence: 38 };
}

export function guessFlag(desc) {
  const hay = (desc || '').toLowerCase();
  if (ATM_HINTS.test(hay)) return 'atm';
  if (REFUND_HINTS.test(hay)) return 'refund';
  if (TRANSFER_HINTS.test(hay)) return 'transfer';
  if (INCOME_HINTS.test(hay)) return 'income';
  return null;
}

export function guessMerchant(desc) {
  if (!desc) return '';
  let d = desc.replace(/\b\d{6,}\b/g, '').replace(/\bUPI\b|\bIMPS\b|\bNEFT\b|\bRTGS\b|\bREF\b|\bTXN\b/gi, '').trim();
  const parts = d.split(/[\/\-]| {2,}/).map(s => s.trim()).filter(Boolean);
  return (parts[0] || d).slice(0, 40);
}
