import React, { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';

const TABS = [
  ['privacy', 'Privacy Center'],
  ['rules', 'Categorization Rules'],
  ['categories', 'Categories'],
  ['backup', 'Backup & Restore'],
];

export default function Settings() {
  const [tab, setTab] = useState('privacy');
  return (
    <div>
      <div className="mb-6">
        <div className="text-[22px] font-bold tracking-tight">Settings & Privacy</div>
        <div className="text-muted text-[13px] mt-0.5">Your data, your control.</div>
      </div>
      <div className="flex gap-1 border-b border-border mb-5 flex-wrap">
        {TABS.map(([id, label]) => (
          <div
            key={id}
            onClick={() => setTab(id)}
            className={`px-3.5 py-2.5 text-[13px] font-semibold cursor-pointer border-b-2 -mb-px ${tab === id ? 'text-accent border-accent' : 'text-muted border-transparent hover:text-text'}`}
          >{label}</div>
        ))}
      </div>
      {tab === 'privacy' && <PrivacyPanel />}
      {tab === 'rules' && <RulesPanel />}
      {tab === 'categories' && <CategoriesPanel />}
      {tab === 'backup' && <BackupPanel />}
    </div>
  );
}

function PrivacyPanel() {
  const { transactions, imports, rules, resetAllData } = useData();

  return (
    <div>
      <div className="card mb-4">
        <div className="card-title">Where your data lives</div>
        <p className="text-[13.5px] text-muted">
          Money Rescue never asks for your bank username, password, UPI PIN, card PIN, OTP, or net banking credentials.
          Statement files are parsed in your browser. Data is stored in your own account and is never visible to other
          family members using this app.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mt-3.5">
          <div><div className="stat-label">Stored transactions</div><div className="text-lg font-bold">{transactions.length}</div></div>
          <div><div className="stat-label">Imports on record</div><div className="text-lg font-bold">{imports.length}</div></div>
          <div><div className="stat-label">Categorization rules</div><div className="text-lg font-bold">{rules.length}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Danger zone</div>
        <div className="flex gap-2.5 flex-wrap">
          <button className="btn btn-danger" onClick={() => {
            if (confirm('This will permanently delete ALL Money Rescue data — transactions, budgets, goals, net worth, everything (categories and rules will reset to defaults). Continue?')) {
              resetAllData();
              toast('All data has been reset.');
            }
          }}>Reset entire account</button>
        </div>
      </div>
    </div>
  );
}

function RulesPanel() {
  const { rules, categories, addRule, updateRule, deleteRule, resetRules } = useData();
  return (
    <div className="card">
      <div className="card-title">Rules</div>
      <div className="text-xs text-muted2 mb-2.5">"If description/merchant contains [pattern] → set category to [category]". Higher priority wins when multiple rules match.</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead><tr className="text-left">
            {['Pattern', 'Category', 'Priority', 'Enabled', ''].map(h => (
              <th key={h} className="text-muted font-semibold text-[11.5px] uppercase tracking-wide py-2.5 px-2.5 border-b border-border">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="border-b border-border">
                <td className="py-2 px-2.5"><input className="field-input" value={r.pattern} onChange={e => updateRule(r.id, { pattern: e.target.value })} /></td>
                <td className="py-2 px-2.5">
                  <select className="field-input" value={r.category} onChange={e => updateRule(r.id, { category: e.target.value })}>
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td className="py-2 px-2.5"><input type="number" className="field-input w-[70px]" value={r.priority} onChange={e => updateRule(r.id, { priority: parseInt(e.target.value) || 1 })} /></td>
                <td className="py-2 px-2.5"><input type="checkbox" checked={r.enabled} onChange={e => updateRule(r.id, { enabled: e.target.checked })} /></td>
                <td className="py-2 px-2.5"><button className="btn btn-ghost btn-sm" onClick={() => deleteRule(r.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-2.5">
        <button className="btn btn-sm" onClick={() => addRule({ pattern: '', category: categories[0] || 'Other', priority: 3 })}>+ Add rule</button>
        <button className="btn btn-sm btn-ghost" onClick={() => { if (confirm('Reset categorization rules to defaults? Your custom rules will be removed.')) resetRules(); }}>Reset to defaults</button>
      </div>
    </div>
  );
}

function CategoriesPanel() {
  const { categories, transactions, addCategory, deleteCategory } = useData();
  const [name, setName] = useState('');
  return (
    <div className="card">
      <div className="card-title">Custom Categories</div>
      <div className="flex gap-2 flex-wrap mb-3.5">
        {categories.map(c => {
          const inUse = transactions.some(t => t.category === c);
          return (
            <div key={c} className="px-3 py-1.5 rounded-full border border-border text-[12.5px] text-muted">
              {c}
              <span
                className="ml-1.5 text-bad cursor-pointer"
                onClick={() => {
                  if (inUse && !confirm(`"${c}" is used by existing transactions. They will be moved to "Other". Continue?`)) return;
                  deleteCategory(c);
                }}
              >✕</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input className="field-input" placeholder="New category name" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn" onClick={() => { if (name.trim()) { addCategory(name.trim()); setName(''); } }}>Add</button>
      </div>
    </div>
  );
}

function BackupPanel() {
  const { restoreBackup } = useData();
  const toast = useToast();
  const fileInputRef = React.useRef(null);
  const [restoring, setRestoring] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // { name, data } — awaiting confirmation

  const exportAll = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
      const res = await fetch(base + '/backup/export', { credentials: 'include' });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'money-rescue-backup.json'; a.click();
    } catch (e) {
      toast('Could not export data right now.');
    }
  };

  const onPickFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.transactions)) {
        toast('That file doesn\'t look like a Money Rescue backup — missing a "transactions" list.');
        return;
      }
      setPendingFile({ name: file.name, data: parsed });
    } catch (e) {
      toast('Could not read that file — make sure it\'s a Money Rescue backup JSON file.');
    }
  };

  const confirmRestore = async () => {
    if (!pendingFile) return;
    setRestoring(true);
    try {
      const res = await restoreBackup(pendingFile.data);
      toast(`Restored ${res.restoredTransactions} transaction${res.restoredTransactions !== 1 ? 's' : ''}.`);
      setPendingFile(null);
    } catch (e) {
      toast(e.message || 'Restore failed. Your previous data was not changed.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="card-title">Export All Money Rescue Data</div>
        <p className="text-[13.5px] text-muted">A full JSON backup including your transactions, categories, rules, budgets, goals, and net worth records.</p>
        <button className="btn btn-primary" onClick={exportAll}>Export All Data (JSON)</button>
      </div>
      <div className="card">
        <div className="card-title">Restore from Backup</div>
        <p className="text-[13.5px] text-muted mb-3">
          Restoring <strong className="text-bad">replaces all current data</strong> in this account with what's in the
          backup file — it does not merge. If the restore fails partway for any reason, nothing is changed; it either
          fully succeeds or your existing data stays exactly as it was.
        </p>
        <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={restoring}>
          {restoring ? 'Restoring…' : 'Choose backup file…'}
        </button>
        <input
          ref={fileInputRef} type="file" accept=".json,application/json" className="hidden"
          onChange={e => { onPickFile(e.target.files[0]); e.target.value = ''; }}
        />
      </div>

      {pendingFile ? (
        <Modal
          title="Confirm restore"
          onClose={() => setPendingFile(null)}
          onConfirm={confirmRestore}
          confirmLabel={restoring ? 'Restoring…' : 'Replace my data'}
        >
          <p className="text-[13.5px] mb-3">
            <strong>{pendingFile.name}</strong> contains <strong>{pendingFile.data.transactions.length}</strong> transaction{pendingFile.data.transactions.length !== 1 ? 's' : ''}
            {pendingFile.data.exportedAt ? <> (exported {new Date(pendingFile.data.exportedAt).toLocaleString()})</> : null}.
          </p>
          <p className="text-[13.5px] text-bad">
            This will permanently replace everything currently in your account — transactions, budgets, goals, net worth,
            categories, and rules — with the contents of this file. This cannot be undone.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
