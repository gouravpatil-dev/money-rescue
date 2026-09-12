import React from 'react';

export default function StatCard({ label, value, sub, subColor }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub ? <div className={`text-xs mt-1.5 font-semibold ${subColor || 'text-muted'}`}>{sub}</div> : null}
    </div>
  );
}
