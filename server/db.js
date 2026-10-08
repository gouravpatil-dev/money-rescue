const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || __dirname;

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'money-rescue.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT,
  description TEXT,
  merchant TEXT,
  amount REAL,
  type TEXT,
  category TEXT,
  confidence INTEGER,
  flag TEXT,
  account TEXT,
  tags TEXT DEFAULT '[]',
  notes TEXT DEFAULT '',
  recurring INTEGER DEFAULT 0,
  source TEXT,
  import_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_import ON transactions(import_id);

CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT,
  date TEXT,
  period_start TEXT,
  period_end TEXT,
  count INTEGER,
  status TEXT
);
CREATE INDEX IF NOT EXISTS idx_imports_user ON imports(user_id);

CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern TEXT,
  category TEXT,
  priority INTEGER DEFAULT 3,
  enabled INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_rules_user ON rules(user_id);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

CREATE TABLE IF NOT EXISTS budgets (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  limit_amount REAL NOT NULL,
  PRIMARY KEY (user_id, category)
);

CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  overall_budget REAL,
  ai_enabled INTEGER DEFAULT 0,
  monthly_income_estimate REAL
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  target REAL,
  current REAL DEFAULT 0,
  deadline TEXT,
  priority TEXT DEFAULT 'medium'
);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

CREATE TABLE IF NOT EXISTS networth_items (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  name TEXT,
  amount REAL
);
CREATE INDEX IF NOT EXISTS idx_networth_user ON networth_items(user_id);

CREATE TABLE IF NOT EXISTS networth_snapshots (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT,
  total REAL,
  assets REAL,
  liabilities REAL
);
CREATE INDEX IF NOT EXISTS idx_networth_snap_user ON networth_snapshots(user_id);
`);

const { DEFAULT_RULES, DEFAULT_CATEGORIES } = require('./defaultRules');

function seedDefaultsForUser(userId) {
  const insertCat = db.prepare('INSERT INTO categories (user_id, name) VALUES (?, ?)');
  const insertMany = db.transaction((cats) => {
    for (const c of cats) insertCat.run(userId, c);
  });
  insertMany(DEFAULT_CATEGORIES);

  const insertRule = db.prepare('INSERT INTO rules (id, user_id, pattern, category, priority, enabled) VALUES (?, ?, ?, ?, ?, 1)');
  const insertRules = db.transaction((rules) => {
    for (const r of rules) insertRule.run(cryptoRandomId(), userId, r.pattern, r.category, r.priority);
  });
  insertRules(DEFAULT_RULES);

  db.prepare('INSERT INTO settings (user_id, overall_budget, ai_enabled) VALUES (?, NULL, 0)').run(userId);
}

function cryptoRandomId() {
  return 'r' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

module.exports = { db, seedDefaultsForUser, DEFAULT_CATEGORIES };
