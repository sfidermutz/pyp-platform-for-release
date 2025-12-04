import React from 'react';

export default function DebriefModal({ open, onClose, metrics, narrative }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="panel z-10 w-11/12 max-w-3xl">
        <div className="flex justify-between items-center">
          <h3 className="h1 text-xl">Scenario Debrief</h3>
          <button onClick={onClose} className="text-muted">Close</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {Object.keys(metrics || {}).map(k => (
            <div key={k} className="panel small">
              <div className="muted">{k}</div>
              <div className="text-2xl font-semibold">{metrics[k]}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="muted">Narrative</div>
          <div className="mt-2 text-sm">{narrative}</div>
        </div>
      </div>
    </div>
  );
}
