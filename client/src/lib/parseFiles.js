import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { classify, guessFlag, guessMerchant } from './classify.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

export function parseDateFlexible(str) {
  if (!str) return null;
  str = String(str).trim();
  if (!str) return null;
  if (/^\d{4,6}(\.\d+)?$/.test(str) && Number(str) > 20000 && Number(str) < 60000) {
    const d = XLSX.SSF.parse_date_code(Number(str));
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  let m;
  if ((m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/))) {
    let [, d, mo, y] = m;
    y = y.length === 2 ? '20' + y : y;
    if (Number(mo) > 12) { [d, mo] = [mo, d]; }
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if ((m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
    return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  }
  if ((m = str.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-,]*(\d{2,4})?/))) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon !== undefined) {
      let y = m[3] || new Date().getFullYear();
      y = String(y).length === 2 ? '20' + y : String(y);
      return `${y}-${String(mon + 1).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    }
  }
  if ((m = str.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{2,4})?/))) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mon !== undefined) {
      let y = m[3] || new Date().getFullYear();
      y = String(y).length === 2 ? '20' + y : String(y);
      return `${y}-${String(mon + 1).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
    }
  }
  return null;
}

export function parseAmountFlexible(str) {
  if (str === null || str === undefined) return null;
  if (typeof str === 'number') return str;
  let s = String(str).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/^-/.test(s)) { neg = true; }
  s = s.replace(/[₹$,\s]/g, '').replace(/^-/, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const v = parseFloat(s);
  return neg ? -v : v;
}

export function guessColumnMapping(headers) {
  const norm = headers.map(h => (h || '').toString().toLowerCase().trim());
  const find = (cands) => {
    for (const c of cands) {
      const i = norm.findIndex(h => h.includes(c));
      if (i > -1) return headers[i];
    }
    return null;
  };
  return {
    date: find(['transaction date', 'txn date', 'value date', 'date']),
    description: find(['narration', 'description', 'particulars', 'details', 'remarks']),
    debit: find(['debit', 'withdrawal', 'dr amount', 'paid out']),
    credit: find(['credit', 'deposit', 'cr amount', 'paid in']),
    amount: find(['amount']),
    type: find(['dr/cr', 'type', 'transaction type', 'cr/dr']),
    balance: find(['balance', 'closing balance', 'running balance']),
    refNo: find(['reference', 'ref no', 'cheque', 'chq']),
  };
}

// Bank statement exports commonly have many preamble rows (bank name/address, account
// number, IFSC, statement period, opening balance, disclaimers) before the real header
// row. Rather than assume the header is near the top, we scan a much wider window and
// score each row by how many recognizable header keywords it contains — the real header
// row for transaction data reliably scores highest.
const HEADER_KEYWORDS = [
  'date', 'narration', 'description', 'particulars', 'remarks', 'details',
  'debit', 'withdrawal', 'credit', 'deposit', 'amount', 'balance',
  'reference', 'cheque', 'chq', 'type', 'transaction',
];
function scoreHeaderRow(row) {
  const cells = row.map(c => String(c || '').toLowerCase().trim()).filter(Boolean);
  if (cells.length < 3) return 0;
  let score = 0;
  cells.forEach(cell => {
    if (HEADER_KEYWORDS.some(k => cell.includes(k))) score++;
  });
  // A row that's mostly keyword matches (not just one lucky cell) is a strong signal.
  return score >= 2 ? score : 0;
}
function findHeaderRow(rows, scanLimit = 60) {
  let bestIdx = -1, bestScore = 0;
  for (let i = 0; i < Math.min(rows.length, scanLimit); i++) {
    const score = scoreHeaderRow(rows[i]);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  if (bestIdx >= 0) return bestIdx;
  // Fallback: first row with at least 3 non-empty cells, anywhere in the scan window.
  for (let i = 0; i < Math.min(rows.length, scanLimit); i++) {
    const nonEmpty = rows[i].filter(c => c && String(c).trim());
    if (nonEmpty.length >= 3) return i;
  }
  return 0;
}

export function rowsFromCSV(text) {
  const parsed = Papa.parse(text, { skipEmptyLines: true });
  const rows = parsed.data;
  if (!rows.length) return { headers: [], data: [] };
  const headerIdx = findHeaderRow(rows);
  const headers = rows[headerIdx].map(h => String(h || '').trim());
  const data = rows.slice(headerIdx + 1).filter(r => r.some(c => c && String(c).trim()));
  return { headers, data };
}

export function rowsFromXLSX(ab) {
  const wb = XLSX.read(ab, { type: 'array', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
  if (!rows.length) return { headers: [], data: [] };
  const headerIdx = findHeaderRow(rows);
  const headers = (rows[headerIdx] || []).map(h => String(h || '').trim());
  const data = rows.slice(headerIdx + 1).filter(r => r.some(c => c && String(c).trim()));
  return { headers, data };
}

export async function extractPDFText(ab) {
  const doc = await pdfjsLib.getDocument({ data: ab }).promise;
  let lines = [];
  let hadText = false;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    if (content.items.length) hadText = true;
    const byY = {};
    content.items.forEach(it => {
      const y = Math.round(it.transform[5]);
      if (!byY[y]) byY[y] = [];
      byY[y].push(it);
    });
    const ys = Object.keys(byY).map(Number).sort((a, b) => b - a);
    ys.forEach(y => {
      const items = byY[y].sort((a, b) => a.transform[4] - b.transform[4]);
      const line = items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
    });
  }
  return { lines, pages: doc.numPages, hadText };
}

const PDF_LINE_RE = /^(\d{1,2}[\/\-. ]\S{2,9}[\/\-. ]?\d{0,4})\s+(.*?)\s+([\d,]+\.\d{2})\s*(Dr|Cr|DR|CR)?\s*(?:([\d,]+\.\d{2}))?\s*$/;
function parsePDFLine(line) {
  const m = line.match(PDF_LINE_RE);
  if (!m) return null;
  const date = parseDateFlexible(m[1]);
  if (!date) return null;
  const amount = parseAmountFlexible(m[3]);
  if (amount === null) return null;
  const drcr = (m[4] || '').toLowerCase();
  const balance = m[5] ? parseAmountFlexible(m[5]) : null;
  let type = null;
  if (drcr === 'dr') type = 'debit';
  else if (drcr === 'cr') type = 'credit';
  return { date, description: m[2].trim(), amount, type, balance, confidence: type ? 80 : 55 };
}

function buildStagedRow(dateStr, descStr, amountVal, typeHint, rules, extra) {
  const date = parseDateFlexible(dateStr) || null;
  const amount = amountVal === null || amountVal === undefined ? null : Math.abs(amountVal);
  const cls = classify(descStr, '', rules);
  const flagGuess = guessFlag(descStr);
  return Object.assign({
    _stagingId: 'stg' + Math.random().toString(36).slice(2, 10),
    date, description: (descStr || '').trim(), merchant: guessMerchant(descStr),
    amount, type: typeHint || 'debit',
    category: cls.category, confidence: cls.confidence,
    flag: flagGuess,
    include: true, isDuplicate: false, needsReview: (!date || amount === null || !descStr),
  }, extra || {});
}

export function stageFromCSVXLSX(headers, data, mapping, rules) {
  const staged = [];
  for (const row of data) {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    const dateRaw = mapping.date ? obj[mapping.date] : '';
    const descRaw = mapping.description ? obj[mapping.description] : (mapping.refNo ? obj[mapping.refNo] : '');
    let amount = null, type = null;
    if (mapping.debit || mapping.credit) {
      const deb = parseAmountFlexible(mapping.debit ? obj[mapping.debit] : null);
      const cred = parseAmountFlexible(mapping.credit ? obj[mapping.credit] : null);
      if (deb) { amount = deb; type = 'debit'; }
      else if (cred) { amount = cred; type = 'credit'; }
    } else if (mapping.amount) {
      const a = parseAmountFlexible(obj[mapping.amount]);
      if (a !== null) {
        amount = Math.abs(a);
        type = a < 0 ? 'debit' : 'credit';
        if (mapping.type) {
          const t = String(obj[mapping.type] || '').toLowerCase();
          if (t.includes('dr') || t.includes('debit')) type = 'debit';
          if (t.includes('cr') || t.includes('credit')) type = 'credit';
        }
      }
    }
    // A row with neither a parseable date nor a parseable amount isn't a transaction —
    // it's almost always a footer/legend/disclaimer line (e.g. "18. EBA - Transaction on
    // ICICI Direct" explaining an abbreviation code). Drop it silently instead of staging
    // it as a confusing "needs review" row the user would have to manually uncheck.
    const parsedDate = parseDateFlexible(dateRaw);
    if (!parsedDate && amount === null) continue;
    staged.push(buildStagedRow(dateRaw, descRaw, amount, type, rules, {
      balance: mapping.balance ? parseAmountFlexible(obj[mapping.balance]) : null,
      rawOriginal: obj,
    }));
  }
  return staged;
}

export function stageFromPDFLines(lines, rules) {
  const staged = [];
  for (const line of lines) {
    const parsed = parsePDFLine(line);
    if (!parsed) continue;
    const row = buildStagedRow(parsed.date, parsed.description, parsed.amount, parsed.type, rules, {
      balance: parsed.balance, confidence: parsed.confidence, rawOriginal: { line },
    });
    if (!row.type) row.needsReview = true;
    staged.push(row);
  }
  return staged;
}

export function markDuplicatesAgainstExisting(staged, existingTransactions) {
  const existingKey = new Set(existingTransactions.map(t => `${t.date}|${t.amount}|${(t.description || '').toLowerCase().slice(0, 20)}`));
  const seen = new Set();
  staged.forEach(r => {
    const k = `${r.date}|${r.amount}|${(r.description || '').toLowerCase().slice(0, 20)}`;
    if (existingKey.has(k) || seen.has(k)) r.isDuplicate = true;
    seen.add(k);
  });
}
