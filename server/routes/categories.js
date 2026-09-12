const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT name FROM categories WHERE user_id = ? ORDER BY id ASC').all(req.session.userId);
  res.json(rows.map(r => r.name));
});

router.post('/', (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required.' });
  const existing = db.prepare('SELECT id FROM categories WHERE user_id = ? AND name = ?').get(req.session.userId, name.trim());
  if (existing) return res.status(409).json({ error: 'Category already exists.' });
  db.prepare('INSERT INTO categories (user_id, name) VALUES (?, ?)').run(req.session.userId, name.trim());
  res.status(201).json({ ok: true });
});

// Delete a category; reassign any transactions using it to "Other"
router.delete('/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const run = db.transaction(() => {
    db.prepare('UPDATE transactions SET category = ? WHERE user_id = ? AND category = ?').run('Other', req.session.userId, name);
    db.prepare('DELETE FROM categories WHERE user_id = ? AND name = ?').run(req.session.userId, name);
  });
  run();
  res.json({ ok: true });
});

module.exports = router;
