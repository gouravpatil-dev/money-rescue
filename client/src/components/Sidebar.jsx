import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', ic: '◆', end: true },
  { to: '/transactions', label: 'Transactions', ic: '≡' },
  { to: '/upload', label: 'Upload Statement', ic: '↑' },
  { to: '/analysis', label: 'Analysis', ic: '◫' },
  { to: '/leaks', label: 'Money Leaks', ic: '⚠' },
  { to: '/rescue', label: 'Rescue Plan', ic: '✦' },
  { to: '/budgets', label: 'Budgets', ic: '▤' },
  { to: '/goals', label: 'Goals', ic: '●' },
  { to: '/networth', label: 'Net Worth', ic: '§' },
  { to: '/recurring', label: 'Recurring', ic: '↻' },
  { to: '/review', label: 'Monthly Review', ic: '◷' },
  { to: '/reports', label: 'Reports', ic: '▦' },
  { to: '/settings', label: 'Settings & Privacy', ic: '⚙' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <div className="w-[236px] shrink-0 bg-bgElevated border-r border-border flex flex-col p-3 sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center gap-2.5 px-2.5 pb-5 pt-1.5">
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-accent to-accent2 flex items-center justify-center font-bold text-bg text-base">₹</div>
        <div>
          <div className="font-bold text-[15.5px] tracking-tight">Money Rescue</div>
          <div className="text-[10.5px] text-muted2 mt-0.5">Personal finance, private by design</div>
        </div>
      </div>
      {NAV.map(n => (
        <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}>
          <span className="w-[18px] text-center text-sm">{n.ic}</span>{n.label}
        </NavLink>
      ))}
      <div className="flex-1" />
      <div className="px-2.5 pt-2.5 border-t border-border mt-2">
        <div className="text-[12px] text-muted mb-1.5 truncate">{user?.name}</div>
        <button onClick={logout} className="text-[11.5px] text-muted2 hover:text-bad transition">Sign out</button>
      </div>
      <div className="px-2.5 pt-2.5 text-[11px] text-muted2">
        Data is private to your account.<br />No bank credentials ever required.
      </div>
    </div>
  );
}
