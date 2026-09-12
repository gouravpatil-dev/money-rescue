const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM imports WHERE user_id = ? ORDER BY date DESC').all(req.session.userId);
  res.json(rows.map(r => ({
    id: r.id, fileName: r.file_name, date: r.date, periodStart: r.period_start,
    periodEnd: r.period_end, count: r.count, status: r.status,
  })));
});

// Remove an entire imported dataset and its transactions
router.delete('/:id', (req, res) => {
  const run = db.transaction(() => {
    db.prepare('DELETE FROM transactions WHERE import_id = ? AND user_id = ?').run(req.params.id, req.session.userId);
    db.prepare('DELETE FROM imports WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  });
  run();
  res.json({ ok: true });
});

module.exports = router;
