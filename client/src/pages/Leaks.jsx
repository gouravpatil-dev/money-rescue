import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { fmtINR } from '../lib/format.js';
import { moneyLeakAnalysis } from '../lib/analysis.js';

export default function Leaks() {
  const { transactions, loading } = useData();

  if (loading) return <div className="text-muted">Loading…</div>;

  if (!transactions.length) {
    return (
      <div>
        <div className="text-[22px] font-bold tracking-tight mb-6">Money Leaks</div>
        <div className="empty-state">
          <h4 className="text-text text-[15px] font-bold mb-1.5">We need transaction data first</h4>
          <p className="text-sm mb-4">Upload a statement before identifying potential money leaks.</p>
          <Link to="/upload" className="btn btn-primary">Upload statement</Link>
        </div>
      </div>
    );
  }

  const { leaks, score, scoreFactors } = moneyLeakAnalysis(transactions);

  return (
    <div>
      <div className="mb-6">
        <div className="text-[22px] font-bold tracking-tight">Money Leaks</div>
        <div className="text-muted text-[13px] mt-0.5">Potential places you might be unnecessarily losing money — based on the last 3 months.</div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-5 flex-wrap">
          <div>
            <div className="stat-label">Money Leak Score</div>
            <div className="text-4xl font-bold">{score}<span className="text-base text-muted">/100</span></div>
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="text-xs text-muted2 mb-2">This is a transparent estimate, not a fact — higher means more potential room to optimize discretionary spending. It's built from:</div>
            {scoreFactors.length ? scoreFactors.map((f, i) => (
              <div key={i} className="text-[12.5px] text-muted py-0.5">• {f.label} (+{f.weight.toFixed(0)} pts)</div>
            )) : <div className="text-xs text-muted2">No strong factors detected — spending looks fairly controlled.</div>}
          </div>
        </div>
      </div>

      {leaks.length ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold m-0">Prioritized Leaks</h3>
            <span className="text-xs text-muted2">Ranked by financial impact</span>
          </div>
          {leaks.map((l, i) => (
            <div key={i} className="card mb-3" style={{ borderLeft: '3px solid #F5B84F', paddingLeft: '14px' }}>
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <div className="font-bold mb-1">{l.title}</div>
                  <div className="text-[13px] text-muted max-w-[640px]">{l.detail}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`pill ${l.confidence === 'High Confidence' ? 'pill-bad' : l.confidence === 'Potential Leak' ? 'pill-warn' : 'pill-muted'}`}>{l.confidence}</span>
                  <div className="text-xs text-muted mt-1.5">Potentially reducible: <strong className="text-good">{fmtINR(l.potentialSaving)}</strong></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h4 className="text-text text-[15px] font-bold mb-1.5">No significant leaks detected</h4>
          <p className="text-sm">Your spending doesn't show strong signs of unnecessary loss right now.</p>
        </div>
      )}

      <div className="text-xs text-muted2">Note: these are observations and inferences based on your transaction patterns, not certainties. A large or recurring expense isn't automatically "wasteful" — you know your life better than any algorithm.</div>
    </div>
  );
}
