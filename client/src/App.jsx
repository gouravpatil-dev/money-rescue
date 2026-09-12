import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Upload from './pages/Upload.jsx';
import Analysis from './pages/Analysis.jsx';
import Leaks from './pages/Leaks.jsx';
import Budgets from './pages/Budgets.jsx';
import Goals from './pages/Goals.jsx';
import NetWorth from './pages/NetWorth.jsx';
import Recurring from './pages/Recurring.jsx';
import MonthlyReview from './pages/MonthlyReview.jsx';
import Reports from './pages/Reports.jsx';
import RescuePlan from './pages/RescuePlan.jsx';
import Settings from './pages/Settings.jsx';
import { DataProvider } from './context/DataContext.jsx';

function AppShell({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 p-7 md:p-8 pb-16 max-w-[1240px]">{children}</div>
    </div>
  );
}

function Private({ Page }) {
  return (
    <ProtectedRoute>
      <DataProvider>
        <AppShell><Page /></AppShell>
      </DataProvider>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Private Page={Dashboard} />} />
      <Route path="/transactions" element={<Private Page={Transactions} />} />
      <Route path="/upload" element={<Private Page={Upload} />} />
      <Route path="/analysis" element={<Private Page={Analysis} />} />
      <Route path="/leaks" element={<Private Page={Leaks} />} />
      <Route path="/budgets" element={<Private Page={Budgets} />} />
      <Route path="/goals" element={<Private Page={Goals} />} />
      <Route path="/networth" element={<Private Page={NetWorth} />} />
      <Route path="/recurring" element={<Private Page={Recurring} />} />
      <Route path="/review" element={<Private Page={MonthlyReview} />} />
      <Route path="/reports" element={<Private Page={Reports} />} />
      <Route path="/rescue" element={<Private Page={RescuePlan} />} />
      <Route path="/settings" element={<Private Page={Settings} />} />
    </Routes>
  );
}
