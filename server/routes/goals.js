const express = require('express');
const { db } = require('../db');

const router = express.Router();
function newId() { return 'g' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(req.session.userId);
  res.json(rows.map(r => ({ id: r.id, name: r.name, target: r.target, current: r.current, deadline: r.deadline, priority: r.priority })));
});

router.post('/', (req, res) => {
  const { name, target, current, deadline, priority } = req.body || {};
  if (!name || !target) return res.status(400).json({ error: 'Goal name and target amount are required.' });
  const id = newId();
  db.prepare('INSERT INTO goals (id, user_id, name, target, current, deadline, priority) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.session.userId, name, target, current || 0, deadline || null, priority || 'medium');
  res.status(201).json({ id, name, target, current: current || 0, deadline: deadline || null, priority: priority || 'medium' });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'Goal not found.' });
  const { name, target, current, deadline, priority } = req.body || {};
  db.prepare('UPDATE goals SET name=?, target=?, current=?, deadline=?, priority=? WHERE id=? AND user_id=?')
    .run(
      name ?? existing.name, target ?? existing.target, current ?? existing.current,
      deadline !== undefined ? deadline : existing.deadline, priority ?? existing.priority,
      req.params.id, req.session.userId
    );
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

module.exports = router;
