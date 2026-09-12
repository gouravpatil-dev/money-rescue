import React from 'react';

export default function Modal({ title, onClose, onConfirm, confirmLabel = 'Save', children }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-[100] p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl2 p-6 max-w-[560px] w-full max-h-[85vh] overflow-y-auto">
        <h3 className="mt-0 mb-4 text-lg font-bold">{title}</h3>
        {children}
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn" onClick={onClose}>Cancel</button>
          {onConfirm ? <button className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button> : null}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
