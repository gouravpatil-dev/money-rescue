import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { fmtINR, todayISO } from '../lib/format.js';
import {
  rowsFromCSV, rowsFromXLSX, extractPDFText, guessColumnMapping,
  stageFromCSVXLSX, stageFromPDFLines, markDuplicatesAgainstExisting,
} from '../lib/parseFiles.js';
import { ConfBadge } from './Transactions.jsx';

const STEPS = ['Reading file', 'Extracting transactions', 'Detecting columns', 'Preparing review'];

export default function Upload() {
  const { transactions, imports, categories, rules, bulkImport, removeImport } = useData();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [pending, setPending] = useState(null); // { meta, staged }

  const handleFile = async (file) => {
    setProcessing(true);
    setStepIdx(0);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let staged = [], meta = { fileName: file.name };

      if (ext === 'csv') {
        const text = await file.text();
        setStepIdx(1);
        const { headers, data } = rowsFromCSV(text);
        setStepIdx(2);
        const mapping = guessColumnMapping(headers);
        staged = stageFromCSVXLSX(headers, data, mapping, rules);
        meta = { ...meta, headers, mapping, kind: 'csv' };
      } else if (ext === 'xlsx' || ext === 'xls') {
        const ab = await file.arrayBuffer();
        setStepIdx(1);
        const { headers, data } = rowsFromXLSX(ab);
        setStepIdx(2);
        const mapping = guessColumnMapping(headers);
        staged = stageFromCSVXLSX(headers, data, mapping, rules);
        meta = { ...meta, headers, mapping, kind: 'xlsx' };
      } else if (ext === 'pdf') {
        const ab = await file.arrayBuffer();
        setStepIdx(1);
        const { lines, pages, hadText } = await extractPDFText(ab);
        setStepIdx(2);
        if (!hadText) {
          setProcessing(false);
          toast('This PDF appears to be scanned/image-based and could not be read reliably. Please try exporting a CSV/XLSX statement instead.');
          return;
        }
        staged = stageFromPDFLines(lines, rules);
        meta = { ...meta, pages, kind: 'pdf' };
        if (!staged.length) {
          setProcessing(false);
          toast("We couldn't confidently detect transaction rows in this PDF's layout. Please try CSV/XLSX, or enter transactions manually.");
          return;
        }
      } else {
        setProcessing(false);
        toast('Unsupported file type. Please upload a PDF, CSV, or XLSX file.');
        return;
      }

      setStepIdx(4);
      markDuplicatesAgainstExisting(staged, transactions);
      setTimeout(() => { setProcessing(false); setPending({ meta, staged }); }, 300);
    } catch (e) {
      console.error(e);
      setProcessing(false);
      toast('Something went wrong reading this file. Please check the format or try CSV/XLSX.');
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  if (pending) {
    return (
      <StatementReview
        pending={pending}
        categories={categories}
        rules={rules}
        onCancel={() => setPending(null)}
        onImport={async (toImport, skipDup) => {
          const use = skipDup ? toImport.filter(s => !s.isDuplicate) : toImport;
          const res = await bulkImport(use.map(s => ({
            date: s.date, description: s.description, merchant: s.merchant, amount: s.amount,
            type: s.type, category: s.category, confidence: s.confidence, flag: s.flag,
          })), { fileName: pending.meta.fileName, kind: pending.meta.kind });
          setPending(null);
          toast(`Imported ${res.count} transaction${res.count !== 1 ? 's' : ''}.`);
        }}
        onRemap={(newMapping) => {
          const restaged = stageFromCSVXLSX(pending.meta.headers, pending.staged.map(s => pending.meta.headers.map(h => s.rawOriginal[h])), newMapping, rules);
          markDuplicatesAgainstExisting(restaged, transactions);
          setPending({ meta: { ...pending.meta, mapping: newMapping }, staged: restaged });
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="text-[22px] font-bold tracking-tight">Upload Statement</div>
        <div className="text-muted text-[13px] mt-0.5">Your bank credentials are never required. Upload only your transaction statement or exported spending data.</div>
      </div>

      <div
        className={`border-[1.5px] border-dashed rounded-xl2 p-11 text-center cursor-pointer transition ${dragActive ? 'border-accent bg-accent/10' : 'border-border hover:border-accent hover:bg-accent/10'}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
      >
        <div className="text-3xl mb-2.5">↑</div>
        <div className="font-bold mb-1">Drop your bank statement here, or click to browse</div>
        <div className="text-xs text-muted2">PDF, CSV, or XLSX — processed in your browser, only the reviewed transactions you choose to import are sent to your account.</div>
        <input ref={fileInputRef} type="file" accept=".pdf,.csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="card"><div className="card-title">Direct bank PDF</div><div className="text-[13px] text-muted">Download the statement from your bank's app or website, then upload the PDF directly — no manual conversion needed for text-based statements.</div></div>
        <div className="card"><div className="card-title">CSV / XLSX</div><div className="text-[13px] text-muted">Exported spreadsheets from net banking. Columns are auto-detected; you can correct the mapping before import.</div></div>
        <div className="card"><div className="card-title">Manual entry</div><div className="text-[13px] text-muted">Prefer not to upload a file? Add transactions one by one from the <a href="/transactions" className="text-accent">Transactions</a> tab.</div></div>
      </div>

      {processing ? (
        <div className="card mt-6">
          <div className="card-title">Processing your statement…</div>
          {STEPS.map((s, i) => (
            <div key={s} className={`flex items-center gap-2.5 py-2 text-[13px] ${i < stepIdx ? 'text-good' : 'text-muted'}`}>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] shrink-0 ${i < stepIdx ? 'bg-good border-good text-bg' : 'border-border'}`}>{i < stepIdx ? '✓' : ''}</span>
              {s}
            </div>
          ))}
        </div>
      ) : null}

      {imports.length ? (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3"><h3 className="text-[15px] font-bold m-0">Import History</h3></div>
          <div className="card overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead><tr className="text-left">
                {['File', 'Imported', 'Period', 'Transactions', 'Status', ''].map(h => (
                  <th key={h} className="text-muted font-semibold text-[11.5px] uppercase tracking-wide py-2.5 px-2.5 border-b border-border">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {imports.slice().reverse().map(im => (
                  <tr key={im.id} className="border-b border-border">
                    <td className="py-2.5 px-2.5">{im.fileName}</td>
                    <td className="py-2.5 px-2.5">{im.date}</td>
                    <td className="py-2.5 px-2.5">{im.periodStart || '—'} → {im.periodEnd || '—'}</td>
                    <td className="py-2.5 px-2.5">{im.count}</td>
                    <td className="py-2.5 px-2.5"><span className="pill pill-good">{im.status}</span></td>
                    <td className="py-2.5 px-2.5">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { if (confirm(`Remove all transactions imported from "${im.fileName}"? This cannot be undone.`)) removeImport(im.id); }}
                      >Remove dataset</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatementReview({ pending, categories, onCancel, onImport, onRemap }) {
  const { meta, staged: initialStaged } = pending;
  const [staged, setStaged] = useState(initialStaged);

  const patch = (sid, fields) => setStaged(prev => prev.map(s => s._stagingId === sid ? { ...s, ...fields } : s));

  const totalDebits = staged.filter(s => s.type === 'debit' && s.include).reduce((a, s) => a + (s.amount || 0), 0);
  const totalCredits = staged.filter(s => s.type === 'credit' && s.include).reduce((a, s) => a + (s.amount || 0), 0);
  const dupCount = staged.filter(s => s.isDuplicate).length;
  const reviewCount = staged.filter(s => s.needsReview).length;
  const avgConf = staged.length ? Math.round(staged.reduce((a, s) => a + s.confidence, 0) / staged.length) : 0;
  const dates = staged.map(s => s.date).filter(Boolean).sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[22px] font-bold tracking-tight">Review statement</div>
          <div className="text-muted text-[13px] mt-0.5">{meta.fileName || 'Uploaded file'} — check the details below before importing.</div>
        </div>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Stat label="Transactions detected" value={staged.length} />
        <Stat label="Total debits" value={fmtINR(totalDebits)} />
        <Stat label="Total credits" value={fmtINR(totalCredits)} />
        <Stat label="Avg. parsing confidence" value={`${avgConf}%`} />
      </div>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Stat label="Possible duplicates" value={dupCount} small />
        <Stat label="Needs review" value={reviewCount} small />
        <div className="card"><div className="stat-label">Statement period</div><div className="text-base font-bold">{dates[0] || '—'} → {dates[dates.length - 1] || '—'}</div></div>
      </div>

      {meta.kind !== 'pdf' ? (
        <ColumnMapping meta={meta} onRemap={onRemap} />
      ) : (
        <div className="text-xs text-muted2 mb-6">Parsed from {meta.pages} PDF page(s). Rows with lower confidence are highlighted — please double-check dates, amounts and types below.</div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold m-0">Transactions</h3>
          <span className="text-xs text-muted2">Uncheck rows you don't want to import. Fix category/type inline.</span>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr className="text-left">
              {['', 'Date', 'Description', 'Amount', 'Type', 'Category', 'Flag', 'Confidence'].map(h => (
                <th key={h} className="text-muted font-semibold text-[11.5px] uppercase tracking-wide py-2.5 px-2.5 border-b border-border">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {staged.map(s => (
                <tr key={s._stagingId} className="border-b border-border" style={s.isDuplicate ? { opacity: 0.55 } : undefined}>
                  <td className="py-2 px-2.5"><input type="checkbox" checked={s.include} onChange={e => patch(s._stagingId, { include: e.target.checked })} /></td>
                  <td className="py-2 px-2.5"><input type="date" className="field-input w-[135px]" value={s.date || ''} onChange={e => patch(s._stagingId, { date: e.target.value })} /></td>
                  <td className="py-2 px-2.5"><input type="text" className="field-input min-w-[180px]" value={s.description} onChange={e => patch(s._stagingId, { description: e.target.value })} /></td>
                  <td className="py-2 px-2.5"><input type="number" className="field-input w-[100px] text-right" value={s.amount || ''} onChange={e => patch(s._stagingId, { amount: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="py-2 px-2.5">
                    <select className="field-input" value={s.type} onChange={e => patch(s._stagingId, { type: e.target.value })}>
                      <option value="debit">Debit</option><option value="credit">Credit</option>
                    </select>
                  </td>
                  <td className="py-2 px-2.5">
                    <select className="field-input" value={s.category} onChange={e => patch(s._stagingId, { category: e.target.value, confidence: 100 })}>
                      {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-2.5">
                    <select className="field-input" value={s.flag || ''} onChange={e => patch(s._stagingId, { flag: e.target.value || null })}>
                      <option value="">Expense</option><option value="income">Income</option>
                      <option value="transfer">Transfer</option><option value="refund">Refund</option><option value="atm">ATM</option>
                    </select>
                  </td>
                  <td className="py-2 px-2.5">{s.isDuplicate ? <span className="pill pill-warn">possible duplicate</span> : <ConfBadge c={s.confidence} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-2.5 justify-end">
        <button className="btn" onClick={() => onImport(staged, true)}>Import only new (skip duplicates)</button>
        <button className="btn btn-primary" onClick={() => onImport(staged, false)}>Import selected</button>
      </div>
    </div>
  );
}

function Stat({ label, value, small }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={small ? 'text-lg font-bold' : 'stat-value'}>{value}</div>
    </div>
  );
}

function ColumnMapping({ meta, onRemap }) {
  const [mapping, setMapping] = useState(meta.mapping);
  const fields = [['date', 'Date'], ['description', 'Description'], ['debit', 'Debit'], ['credit', 'Credit'], ['amount', 'Amount'], ['type', 'Dr/Cr Type'], ['balance', 'Balance']];
  return (
    <div className="card mb-6">
      <div className="card-title">Column mapping</div>
      <div className="text-xs text-muted2 mb-3">We auto-detected these columns. Correct any that look wrong — analysis won't run until required fields are mapped.</div>
      <div className="grid md:grid-cols-3 gap-4">
        {fields.map(([key, label]) => (
          <div key={key}>
            <label className="field-label">{label}</label>
            <select className="field-input" value={mapping[key] || ''} onChange={e => setMapping(m => ({ ...m, [key]: e.target.value || null }))}>
              <option value="">— none —</option>
              {meta.headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>
      <button className="btn btn-sm mt-3" onClick={() => onRemap(mapping)}>Re-apply mapping</button>
    </div>
  );
}
