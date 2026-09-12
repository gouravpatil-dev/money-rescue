const express = require('express');
const { db } = require('../db');

const router = express.Router();

function rowToTx(row) {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    merchant: row.merchant,
    amount: row.amount,
    type: row.type,
    category: row.category,
    confidence: row.confidence,
    flag: row.flag,
    account: row.account,
    tags: JSON.parse(row.tags || '[]'),
    notes: row.notes,
    recurring: !!row.recurring,
    source: row.source,
    importId: row.import_id,
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC').all(req.session.userId);
  res.json(rows.map(rowToTx));
});

router.post('/', (req, res) => {
  const t = req.body || {};
  if (!t.date || !t.description || t.amount === undefined || t.amount === null) {
    return res.status(400).json({ error: 'date, description and amount are required.' });
  }
  const id = t.id || ('tx' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4));
  db.prepare(`INSERT INTO transactions
    (id, user_id, date, description, merchant, amount, type, category, confidence, flag, account, tags, notes, recurring, source, import_id)
    VALUES (@id, @user_id, @date, @description, @merchant, @amount, @type, @category, @confidence, @flag, @account, @tags, @notes, @recurring, @source, @import_id)`)
    .run({
      id, user_id: req.session.userId,
      date: t.date, description: t.description, merchant: t.merchant || '',
      amount: Math.abs(Number(t.amount) || 0), type: t.type || 'debit',
      category: t.category || 'Other', confidence: t.confidence ?? 100,
      flag: t.flag || null, account: t.account || 'Manual',
      tags: JSON.stringify(t.tags || []), notes: t.notes || '',
      recurring: t.recurring ? 1 : 0, source: t.source || 'manual', import_id: t.importId || null,
    });
  const row = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, req.session.userId);
  res.status(201).json(rowToTx(row));
});

// Bulk import — used after the Statement Review screen
router.post('/bulk', (req, res) => {
  const { transactions, importMeta } = req.body || {};
  if (!Array.isArray(transactions) || !transactions.length) {
    return res.status(400).json({ error: 'No transactions to import.' });
  }
  const importId = importMeta?.id || ('imp' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4));
  const insertTx = db.prepare(`INSERT INTO transactions
    (id, user_id, date, description, merchant, amount, type, category, confidence, flag, account, tags, notes, recurring, source, import_id)
    VALUES (@id, @user_id, @date, @description, @merchant, @amount, @type, @category, @confidence, @flag, @account, @tags, @notes, 0, @source, @import_id)`);
  const insertImport = db.prepare(`INSERT INTO imports (id, user_id, file_name, date, period_start, period_end, count, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  const run = db.transaction(() => {
    let count = 0;
    for (const t of transactions) {
      if (!t.date || !t.amount) continue;
      insertTx.run({
        id: 'tx' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4) + count,
        user_id: req.session.userId,
        date: t.date, description: t.description || '', merchant: t.merchant || '',
        amount: Math.abs(Number(t.amount) || 0), type: t.type || 'debit',
        category: t.category || 'Other', confidence: t.confidence ?? 50,
        flag: t.flag || null, account: importMeta?.fileName || 'Import',
        tags: JSON.stringify([]), notes: '',
        source: importMeta?.kind || 'import', import_id: importId,
      });
      count++;
    }
    const dates = transactions.map(t => t.date).filter(Boolean).sort();
    insertImport.run(
      importId, req.session.userId, importMeta?.fileName || 'Unnamed file',
      new Date().toISOString().slice(0, 10), dates[0] || null, dates[dates.length - 1] || null,
      count, 'Imported'
    );
    return count;
  });

  const count = run();
  res.status(201).json({ importId, count });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'Transaction not found.' });
  const t = req.body || {};
  const merged = {
    date: t.date ?? existing.date,
    description: t.description ?? existing.description,
    merchant: t.merchant ?? existing.merchant,
    amount: t.amount !== undefined ? Math.abs(Number(t.amount)) : existing.amount,
    type: t.type ?? existing.type,
    category: t.category ?? existing.category,
    confidence: t.confidence ?? existing.confidence,
    flag: t.flag !== undefined ? t.flag : existing.flag,
    tags: t.tags !== undefined ? JSON.stringify(t.tags) : existing.tags,
    notes: t.notes !== undefined ? t.notes : existing.notes,
  };
  db.prepare(`UPDATE transactions SET date=@date, description=@description, merchant=@merchant, amount=@amount,
    type=@type, category=@category, confidence=@confidence, flag=@flag, tags=@tags, notes=@notes
    WHERE id=@id AND user_id=@user_id`)
    .run({ ...merged, id: req.params.id, user_id: req.session.userId });
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  res.json(rowToTx(row));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

module.exports = router;
