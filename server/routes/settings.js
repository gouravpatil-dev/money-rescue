const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const s = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.session.userId);
  res.json({
    overallBudget: s?.overall_budget ?? null,
    aiEnabled: !!s?.ai_enabled,
    monthlyIncomeEstimate: s?.monthly_income_estimate ?? null,
  });
});

router.put('/', (req, res) => {
  const { aiEnabled, monthlyIncomeEstimate } = req.body || {};
  const existing = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.session.userId);
  if (!existing) {
    db.prepare('INSERT INTO settings (user_id, ai_enabled, monthly_income_estimate) VALUES (?, ?, ?)')
      .run(req.session.userId, aiEnabled ? 1 : 0, monthlyIncomeEstimate ?? null);
  } else {
    db.prepare('UPDATE settings SET ai_enabled = ?, monthly_income_estimate = ? WHERE user_id = ?')
      .run(
        aiEnabled !== undefined ? (aiEnabled ? 1 : 0) : existing.ai_enabled,
        monthlyIncomeEstimate !== undefined ? monthlyIncomeEstimate : existing.monthly_income_estimate,
        req.session.userId
      );
  }
  res.json({ ok: true });
});

module.exports = router;
