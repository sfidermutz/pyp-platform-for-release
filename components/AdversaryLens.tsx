import React from 'react';

export default function AdversaryLens({ trigger, message }: { trigger: string; message: string }) {
  return (
    <div className="panel">
      <div className="text-sm muted">Adversary lens</div>
      <div className="mt-2 text-sm" style={{ color: 'var(--accent)' }}>{message}</div>
      <div className="mt-3 text-xs muted">Trigger: {trigger}</div>
    </div>
  );
}
