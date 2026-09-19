# Money Rescue

A privacy-first personal finance app: upload bank statements (PDF/CSV/XLSX), review and
categorize transactions, and get spending analysis, money-leak detection, budgets, goals,
net worth tracking, and a personalized "Money Rescue Plan" — for you and up to a handful
of family members, each with their own private account.

## Stack

- **Backend:** Node.js + Express + SQLite (`better-sqlite3`), cookie-session auth (`bcryptjs`)
- **Frontend:** React + Vite, plain JavaScript, Tailwind CSS
- File parsing (CSV/XLSX/PDF text extraction) happens **in your browser** — the raw statement
  file itself is never uploaded to the server. Only the reviewed, structured transactions you
  choose to import are sent to your account's database.

## Requirements

- Node.js 18+ and npm

## Setup

```bash
# from the money-rescue/ folder
npm run install:all
```

This installs dependencies for both `server/` and `client/`.

### Configure the server (optional)

Copy `server/.env.example` to `server/.env` if you want to change the port or session secret:

```bash
cp server/.env.example server/.env
```

### Run it

```bash
npm run dev
```

This starts:
- the API server on **http://localhost:4000**
- the React app on **http://localhost:5173**

Open http://localhost:5173, sign up (this creates a private account — each family member should
sign up with their own email so their data stays separate), and start uploading statements.

### Production-ish run

```bash
npm run build --prefix client
npm start
```

This builds the React app and serves it from the Express server on port 4000 (see
`server/index.js` — it serves `client/dist` when present).

## Project structure

```
money-rescue/
  server/            Express API + SQLite database (money-rescue.db is created automatically)
    index.js
    db.js
    middleware/auth.js
    routes/           auth, transactions, imports, rules, categories, budgets, goals, networth, settings, backup
  client/            React app (Vite)
    src/
      api/client.js   fetch wrapper, talks to the API with credentials included
      context/        auth context (who's logged in)
      lib/            parsing (CSV/XLSX/PDF), categorization rules engine, analysis/math functions
      pages/          one file per screen (Dashboard, Transactions, Upload, Analysis, Leaks,
                       Budgets, Goals, NetWorth, Recurring, MonthlyReview, Reports, Settings)
      components/     shared UI (Sidebar, Modal, StatCard, etc.)
```

## Notes on data & privacy

- Passwords are hashed with bcrypt; never stored in plain text.
- Each API route is scoped to `req.session.userId` — one user's transactions, budgets, goals,
  and net worth are never visible to another user, including other family members.
- Bank credentials (net-banking password, UPI PIN, OTP, etc.) are never requested anywhere in
  this app. You only ever upload an exported statement file.
- The SQLite database file (`server/money-rescue.db`) is created next to the server code. Back
  it up like any other file — or use the in-app **Export All Data** button for a portable JSON
  backup per account. **This is the only file that holds your actual data** — as long as you
  don't delete or overwrite it, your account and everything in it survives code updates, server
  restarts, and reboots.
- Sessions are stored persistently in `server/sessions.db` (SQLite), so you stay logged in across
  server restarts — no need to sign in again every time you run the app.

## Where to go next

This is a solid, working core (auth, import → review → categorize, dashboard, analysis, money
leaks, budgets, goals, net worth, recurring detection, backup/restore). Natural next steps:
- Deploy it somewhere reachable by your family (Render/Railway/a home server) instead of localhost
- Harden PDF parsing further against your specific bank's statement layout
- Add the optional AI assistant ("Ask Money Rescue") using your own Anthropic API key server-side
## Added: Money Rescue Plan

The app now includes a dedicated **Money Rescue Plan** at `/rescue`, built on the existing transaction data without requiring a new database schema. It adds:

- Financial health score with explainable factors
- 3-month cash-flow outlook based on recent monthly averages
- Interactive “what if I cut ₹X/month?” savings simulator
- Recurring-payment commitment summary
- Spending priorities that surface discretionary categories to review first

These are analysis features and do not provide investment or financial advice.

