import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import { escapeRegex } from '../lib/format.js';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [imports, setImports] = useState([]);
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [overallBudget, setOverallBudget] = useState(null);
  const [goals, setGoals] = useState([]);
  const [netWorth, setNetWorth] = useState({ assets: [], liabilities: [], history: [] });
  const [settings, setSettings] = useState({ aiEnabled: false, monthlyIncomeEstimate: null });
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tx, imp, rl, cat, bud, gl, nw, st] = await Promise.all([
        api.get('/transactions'),
        api.get('/imports'),
        api.get('/rules'),
        api.get('/categories'),
        api.get('/budgets'),
        api.get('/goals'),
        api.get('/networth'),
        api.get('/settings'),
      ]);
      setTransactions(tx);
      setImports(imp);
      setRules(rl);
      setCategories(cat);
      setBudgets(bud.budgets || {});
      setOverallBudget(bud.overallBudget ?? null);
      setGoals(gl);
      setNetWorth(nw);
      setSettings(st);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ---- Transactions ----
  const refreshTransactions = useCallback(async () => {
    const tx = await api.get('/transactions');
    setTransactions(tx);
    return tx;
  }, []);
  const refreshImports = useCallback(async () => {
    const imp = await api.get('/imports');
    setImports(imp);
    return imp;
  }, []);
  const addTransaction = useCallback(async (t) => {
    await api.post('/transactions', t);
    await refreshTransactions();
  }, [refreshTransactions]);
  const updateTransaction = useCallback(async (id, patch) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    await api.put(`/transactions/${id}`, patch);
  }, []);
  const deleteTransaction = useCallback(async (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    await api.del(`/transactions/${id}`);
  }, []);
  const bulkImport = useCallback(async (transactionsToImport, importMeta) => {
    const res = await api.post('/transactions/bulk', { transactions: transactionsToImport, importMeta });
    await refreshTransactions();
    await refreshImports();
    return res;
  }, [refreshTransactions, refreshImports]);
  const removeImport = useCallback(async (importId) => {
    await api.del(`/imports/${importId}`);
    await refreshTransactions();
    await refreshImports();
  }, [refreshTransactions, refreshImports]);

  // ---- Rules ----
  const addRule = useCallback(async (rule) => {
    const r = await api.post('/rules', rule);
    setRules(prev => [...prev, r]);
  }, []);
  const updateRule = useCallback(async (id, patch) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    await api.put(`/rules/${id}`, patch);
  }, []);
  const deleteRule = useCallback(async (id) => {
    setRules(prev => prev.filter(r => r.id !== id));
    await api.del(`/rules/${id}`);
  }, []);
  const resetRules = useCallback(async () => {
    await api.post('/rules/reset');
    const rl = await api.get('/rules');
    setRules(rl);
  }, []);

  // Correct one transaction's category, then — if it would actually help — offer to
  // (a) apply the same category to this merchant's other existing transactions, and
  // (b) remember it as a rule so future imports auto-categorize this merchant correctly.
  // Uses a plain confirm() dialog to keep this a lightweight, synchronous "yes/no" prompt
  // rather than a full modal, matching the app's existing confirm-dialog patterns.
  const changeCategoryWithMemory = useCallback(async (t, newCategory) => {
    await updateTransaction(t.id, { category: newCategory, confidence: 100 });
    const merchantKey = (t.merchant || t.description || '').trim();
    if (!merchantKey) return;

    const others = transactions.filter(x => x.id !== t.id && (x.merchant || x.description || '').trim() === merchantKey && x.category !== newCategory);
    const alreadyHasRule = rules.some(r => {
      if (!r.enabled || !r.pattern || r.category !== newCategory) return false;
      try { return new RegExp(r.pattern, 'i').test(merchantKey); } catch (e) { return false; }
    });
    if (!others.length && alreadyHasRule) return;

    const parts = [];
    if (others.length) parts.push(`apply "${newCategory}" to ${others.length} other transaction${others.length > 1 ? 's' : ''} from "${merchantKey}"`);
    if (!alreadyHasRule) parts.push(`always categorize "${merchantKey}" as "${newCategory}" in future imports`);
    if (!parts.length) return;

    if (window.confirm(`Also ${parts.join(', and ')}?`)) {
      if (others.length) await Promise.all(others.map(o => updateTransaction(o.id, { category: newCategory, confidence: 100 })));
      if (!alreadyHasRule) await addRule({ pattern: escapeRegex(merchantKey), category: newCategory, priority: 8 });
    }
  }, [transactions, rules, updateTransaction, addRule]);

  // ---- Categories ----
  const addCategory = useCallback(async (name) => {
    await api.post('/categories', { name });
    const cat = await api.get('/categories');
    setCategories(cat);
  }, []);
  const deleteCategory = useCallback(async (name) => {
    await api.del(`/categories/${encodeURIComponent(name)}`);
    const cat = await api.get('/categories');
    setCategories(cat);
    await refreshTransactions();
  }, [refreshTransactions]);

  // ---- Budgets ----
  const setCategoryBudget = useCallback(async (category, limit) => {
    setBudgets(prev => {
      const next = { ...prev };
      if (!limit || limit <= 0) delete next[category]; else next[category] = limit;
      return next;
    });
    await api.put(`/budgets/category/${encodeURIComponent(category)}`, { limit });
  }, []);
  const removeCategoryBudget = useCallback(async (category) => {
    setBudgets(prev => { const next = { ...prev }; delete next[category]; return next; });
    await api.del(`/budgets/category/${encodeURIComponent(category)}`);
  }, []);
  const setOverallBudgetValue = useCallback(async (amount) => {
    setOverallBudget(amount || null);
    await api.put('/budgets/overall', { amount });
  }, []);

  // ---- Goals ----
  const addGoal = useCallback(async (goal) => {
    const g = await api.post('/goals', goal);
    setGoals(prev => [...prev, g]);
  }, []);
  const updateGoal = useCallback(async (id, patch) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
    await api.put(`/goals/${id}`, patch);
  }, []);
  const deleteGoal = useCallback(async (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    await api.del(`/goals/${id}`);
  }, []);

  // ---- Net worth ----
  const refreshNetWorth = useCallback(async () => {
    const nw = await api.get('/networth');
    setNetWorth(nw);
    return nw;
  }, []);
  const addNetWorthItem = useCallback(async (kind, name, amount) => {
    await api.post('/networth/item', { kind, name, amount });
    await refreshNetWorth();
  }, [refreshNetWorth]);
  const deleteNetWorthItem = useCallback(async (id) => {
    await api.del(`/networth/item/${id}`);
    await refreshNetWorth();
  }, [refreshNetWorth]);
  const snapshotNetWorth = useCallback(async () => {
    await api.post('/networth/snapshot');
    await refreshNetWorth();
  }, [refreshNetWorth]);

  // ---- Settings ----
  const updateSettings = useCallback(async (patch) => {
    setSettings(prev => ({ ...prev, ...patch }));
    await api.put('/settings', patch);
  }, []);

  // ---- Danger zone ----
  const resetAllData = useCallback(async () => {
    await api.post('/backup/reset');
    await loadAll();
  }, [loadAll]);

  // Restore a previously-exported backup JSON object. This replaces all current data
  // for this account — the server handles it as one atomic operation (all-or-nothing).
  const restoreBackup = useCallback(async (backupData) => {
    const res = await api.post('/backup/restore', backupData);
    await loadAll();
    return res;
  }, [loadAll]);

  const value = {
    loading,
    transactions, imports, rules, categories, budgets, overallBudget, goals, netWorth, settings,
    refreshTransactions, refreshImports,
    addTransaction, updateTransaction, deleteTransaction, bulkImport, removeImport,
    addRule, updateRule, deleteRule, resetRules, changeCategoryWithMemory,
    addCategory, deleteCategory,
    setCategoryBudget, removeCategoryBudget, setOverallBudgetValue,
    addGoal, updateGoal, deleteGoal,
    refreshNetWorth, addNetWorthItem, deleteNetWorthItem, snapshotNetWorth,
    updateSettings,
    resetAllData, restoreBackup,
    reloadAll: loadAll,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
