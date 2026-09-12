const express = require('express');
const { db } = require('../db');

const router = express.Router();

function newId() { return 'r' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM rules WHERE user_id = ? ORDER BY priority DESC').all(req.session.userId);
  res.json(rows.map(r => ({ id: r.id, pattern: r.pattern, category: r.category, priority: r.priority, enabled: !!r.enabled })));
});

router.post('/', (req, res) => {
  const { pattern, category, priority } = req.body || {};
  const id = newId();
  db.prepare('INSERT INTO rules (id, user_id, pattern, category, priority, enabled) VALUES (?, ?, ?, ?, ?, 1)')
    .run(id, req.session.userId, pattern || '', category || 'Other', priority || 3);
  res.status(201).json({ id, pattern: pattern || '', category: category || 'Other', priority: priority || 3, enabled: true });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM rules WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'Rule not found.' });
  const { pattern, category, priority, enabled } = req.body || {};
  db.prepare('UPDATE rules SET pattern=?, category=?, priority=?, enabled=? WHERE id=? AND user_id=?')
    .run(
      pattern ?? existing.pattern, category ?? existing.category,
      priority ?? existing.priority, (enabled ?? existing.enabled) ? 1 : 0,
      req.params.id, req.session.userId
    );
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM rules WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

// Reset to the app's default rule set
router.post('/reset', (req, res) => {
  const { DEFAULT_RULES } = require('../defaultRules');
  const run = db.transaction(() => {
    db.prepare('DELETE FROM rules WHERE user_id = ?').run(req.session.userId);
    const insert = db.prepare('INSERT INTO rules (id, user_id, pattern, category, priority, enabled) VALUES (?, ?, ?, ?, ?, 1)');
    for (const r of DEFAULT_RULES) insert.run(newId(), req.session.userId, r.pattern, r.category, r.priority);
  });
  run();
  res.json({ ok: true });
});

module.exports = router;
