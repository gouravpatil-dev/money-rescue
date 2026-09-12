const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT category, limit_amount FROM budgets WHERE user_id = ?').all(req.session.userId);
  const budgets = {};
  rows.forEach(r => { budgets[r.category] = r.limit_amount; });
  const settings = db.prepare('SELECT overall_budget FROM settings WHERE user_id = ?').get(req.session.userId);
  res.json({ budgets, overallBudget: settings ? settings.overall_budget : null });
});

router.put('/category/:category', (req, res) => {
  const category = decodeURIComponent(req.params.category);
  const { limit } = req.body || {};
  if (!limit || limit <= 0) {
    db.prepare('DELETE FROM budgets WHERE user_id = ? AND category = ?').run(req.session.userId, category);
    return res.json({ ok: true, removed: true });
  }
  db.prepare('INSERT INTO budgets (user_id, category, limit_amount) VALUES (?, ?, ?) ON CONFLICT(user_id, category) DO UPDATE SET limit_amount = excluded.limit_amount')
    .run(req.session.userId, category, limit);
  res.json({ ok: true });
});

router.delete('/category/:category', (req, res) => {
  const category = decodeURIComponent(req.params.category);
  db.prepare('DELETE FROM budgets WHERE user_id = ? AND category = ?').run(req.session.userId, category);
  res.json({ ok: true });
});

router.put('/overall', (req, res) => {
  const { amount } = req.body || {};
  db.prepare('UPDATE settings SET overall_budget = ? WHERE user_id = ?').run(amount || null, req.session.userId);
  res.json({ ok: true });
});

module.exports = router;
