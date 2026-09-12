const express = require('express');
const { db } = require('../db');

const router = express.Router();
function newId() { return 'n' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM networth_items WHERE user_id = ?').all(req.session.userId);
  const snapshots = db.prepare('SELECT * FROM networth_snapshots WHERE user_id = ? ORDER BY date ASC').all(req.session.userId);
  res.json({
    assets: items.filter(i => i.kind === 'asset').map(i => ({ id: i.id, name: i.name, amount: i.amount })),
    liabilities: items.filter(i => i.kind === 'liability').map(i => ({ id: i.id, name: i.name, amount: i.amount })),
    history: snapshots.map(s => ({ date: s.date, total: s.total, assets: s.assets, liabilities: s.liabilities })),
  });
});

router.post('/item', (req, res) => {
  const { kind, name, amount } = req.body || {};
  if (!['asset', 'liability'].includes(kind) || !name || amount === undefined) {
    return res.status(400).json({ error: 'kind, name and amount are required.' });
  }
  const id = newId();
  db.prepare('INSERT INTO networth_items (id, user_id, kind, name, amount) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.session.userId, kind, name, amount);
  res.status(201).json({ id, kind, name, amount });
});

router.delete('/item/:id', (req, res) => {
  db.prepare('DELETE FROM networth_items WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

router.post('/snapshot', (req, res) => {
  const items = db.prepare('SELECT * FROM networth_items WHERE user_id = ?').all(req.session.userId);
  const assets = items.filter(i => i.kind === 'asset').reduce((s, i) => s + i.amount, 0);
  const liabilities = items.filter(i => i.kind === 'liability').reduce((s, i) => s + i.amount, 0);
  const id = newId();
  const date = new Date().toISOString().slice(0, 10);
  db.prepare('INSERT INTO networth_snapshots (id, user_id, date, total, assets, liabilities) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.session.userId, date, assets - liabilities, assets, liabilities);
  res.status(201).json({ id, date, total: assets - liabilities, assets, liabilities });
});

module.exports = router;
