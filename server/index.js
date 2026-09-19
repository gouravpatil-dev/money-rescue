require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const { requireAuth } = require('./middleware/auth');

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' }));
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: process.env.DATA_DIR || __dirname,
  }),  
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  },
  // Sessions are stored in server/sessions.db (SQLite), so you stay logged in
  // across server restarts — no need to sign in again every time you run the app.
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', requireAuth, require('./routes/transactions'));
app.use('/api/imports', requireAuth, require('./routes/imports'));
app.use('/api/rules', requireAuth, require('./routes/rules'));
app.use('/api/categories', requireAuth, require('./routes/categories'));
app.use('/api/budgets', requireAuth, require('./routes/budgets'));
app.use('/api/goals', requireAuth, require('./routes/goals'));
app.use('/api/networth', requireAuth, require('./routes/networth'));
app.use('/api/settings', requireAuth, require('./routes/settings'));
app.use('/api/backup', requireAuth, require('./routes/backup'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the built React app if present (production-ish mode: `npm run build --prefix client && npm start`)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Money Rescue API listening on http://localhost:${PORT}`);
});
