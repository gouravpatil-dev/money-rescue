const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/export', (req, res) => {
  const uid = req.session.userId;
  const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(uid)
    .map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
  const imports = db.prepare('SELECT * FROM imports WHERE user_id = ?').all(uid);
  const rules = db.prepare('SELECT * FROM rules WHERE user_id = ?').all(uid);
  const categories = db.prepare('SELECT name FROM categories WHERE user_id = ?').all(uid).map(r => r.name);
  const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ?').all(uid);
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(uid);
  const networthItems = db.prepare('SELECT * FROM networth_items WHERE user_id = ?').all(uid);
  const networthSnapshots = db.prepare('SELECT * FROM networth_snapshots WHERE user_id = ?').all(uid);
  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(uid);

  res.setHeader('Content-Disposition', 'attachment; filename="money-rescue-backup.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    transactions, imports, rules, categories, budgets, goals,
    networthItems, networthSnapshots, settings,
  });
});

// Wipe all data for the current account (transactions, imports, budgets, goals, net worth)
// but keep the account itself and re-seed default categories/rules.
router.post('/reset', (req, res) => {
  const uid = req.session.userId;
  const { seedDefaultsForUser } = require('../db');
  const run = db.transaction(() => {
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM imports WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM rules WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM categories WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM networth_items WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM networth_snapshots WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM settings WHERE user_id = ?').run(uid);
    seedDefaultsForUser(uid);
  });
  run();
  res.json({ ok: true });
});

// Restore a full backup (as produced by GET /export) into the current account.
// This replaces all of the current account's data — it does not merge. IDs from the
// backup are reused where present so cross-references (e.g. a transaction's importId)
// stay intact, but user_id is always overridden to the current session's user, so a
// backup can safely be restored into a different account than the one it came from.
router.post('/restore', (req, res) => {
  const uid = req.session.userId;
  const backup = req.body;

  if (!backup || typeof backup !== 'object' || !Array.isArray(backup.transactions)) {
    return res.status(400).json({ error: 'This does not look like a valid Money Rescue backup file.' });
  }

  const { seedDefaultsForUser } = require('../db');

  const run = db.transaction(() => {
    // Wipe current data first (mirrors /reset), but do NOT reseed defaults —
    // the backup supplies its own categories and rules.
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM imports WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM rules WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM categories WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM networth_items WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM networth_snapshots WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM settings WHERE user_id = ?').run(uid);

    // Categories
    const insertCat = db.prepare('INSERT INTO categories (user_id, name) VALUES (?, ?)');
    (backup.categories || []).forEach(name => { if (name) insertCat.run(uid, name); });
    // Guarantee at least a baseline so the app isn't left with zero categories.
    if (!backup.categories || !backup.categories.length) {
      const { DEFAULT_CATEGORIES } = require('../defaultRules');
      DEFAULT_CATEGORIES.forEach(name => insertCat.run(uid, name));
    }

    // Rules
    const insertRule = db.prepare('INSERT INTO rules (id, user_id, pattern, category, priority, enabled) VALUES (?, ?, ?, ?, ?, ?)');
    (backup.rules || []).forEach(r => {
      if (!r || !r.id) return;
      insertRule.run(r.id, uid, r.pattern || '', r.category || 'Other', r.priority ?? 3, r.enabled ? 1 : 0);
    });

    // Imports (insert before transactions so import_id references make sense, though not FK-enforced)
    const insertImport = db.prepare('INSERT INTO imports (id, user_id, file_name, date, period_start, period_end, count, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    (backup.imports || []).forEach(im => {
      if (!im || !im.id) return;
      insertImport.run(im.id, uid, im.file_name || im.fileName || '', im.date || null, im.period_start || im.periodStart || null, im.period_end || im.periodEnd || null, im.count || 0, im.status || 'Imported');
    });

    // Transactions
    const insertTx = db.prepare(`INSERT INTO transactions
      (id, user_id, date, description, merchant, amount, type, category, confidence, flag, account, tags, notes, recurring, source, import_id)
      VALUES (@id, @user_id, @date, @description, @merchant, @amount, @type, @category, @confidence, @flag, @account, @tags, @notes, @recurring, @source, @import_id)`);
    backup.transactions.forEach(t => {
      if (!t || !t.id || !t.date) return;
      insertTx.run({
        id: t.id, user_id: uid, date: t.date, description: t.description || '',
        merchant: t.merchant || '', amount: Number(t.amount) || 0, type: t.type || 'debit',
        category: t.category || 'Other', confidence: t.confidence ?? 100, flag: t.flag || null,
        account: t.account || '', tags: JSON.stringify(Array.isArray(t.tags) ? t.tags : []),
        notes: t.notes || '', recurring: t.recurring ? 1 : 0, source: t.source || 'restore',
        import_id: t.import_id || t.importId || null,
      });
    });

    // Budgets
    const insertBudget = db.prepare('INSERT INTO budgets (user_id, category, limit_amount) VALUES (?, ?, ?)');
    (backup.budgets || []).forEach(b => {
      if (!b || !b.category) return;
      insertBudget.run(uid, b.category, b.limit_amount ?? b.limit ?? 0);
    });

    // Goals
    const insertGoal = db.prepare('INSERT INTO goals (id, user_id, name, target, current, deadline, priority) VALUES (?, ?, ?, ?, ?, ?, ?)');
    (backup.goals || []).forEach(g => {
      if (!g || !g.id) return;
      insertGoal.run(g.id, uid, g.name || '', g.target || 0, g.current || 0, g.deadline || null, g.priority || 'medium');
    });

    // Net worth
    const insertNW = db.prepare('INSERT INTO networth_items (id, user_id, kind, name, amount) VALUES (?, ?, ?, ?, ?)');
    (backup.networthItems || []).forEach(n => {
      if (!n || !n.id) return;
      insertNW.run(n.id, uid, n.kind, n.name || '', n.amount || 0);
    });
    const insertSnap = db.prepare('INSERT INTO networth_snapshots (id, user_id, date, total, assets, liabilities) VALUES (?, ?, ?, ?, ?, ?)');
    (backup.networthSnapshots || []).forEach(s => {
      if (!s || !s.id) return;
      insertSnap.run(s.id, uid, s.date, s.total || 0, s.assets || 0, s.liabilities || 0);
    });

    // Settings
    const s = backup.settings || {};
    db.prepare('INSERT INTO settings (user_id, overall_budget, ai_enabled, monthly_income_estimate) VALUES (?, ?, ?, ?)')
      .run(uid, s.overall_budget ?? null, s.ai_enabled ? 1 : 0, s.monthly_income_estimate ?? null);
  });

  try {
    run();
  } catch (e) {
    // better-sqlite3 transactions are atomic — if anything above threw, everything in
    // this transaction (including the initial wipe) was rolled back automatically, so
    // the account's previous data is untouched.
    console.error('Restore failed:', e);
    return res.status(500).json({ error: 'Restore failed — nothing was changed, your previous data is untouched. Check the backup file, or check the server logs for details.' });
  }

  res.json({ ok: true, restoredTransactions: backup.transactions.length });
});

module.exports = router;
