import React from 'react';

type Props = {
  label: string;
  value: number;
  delta?: number;
  tooltip?: string;
  color?: string;
};

export default function MetricTile({ label, value, delta, tooltip, color }: Props) {
  return (
    <div className="panel flex flex-col items-start justify-between w-full" style={{ minWidth: 180 }}>
      <div className="flex items-center justify-between w-full">
        <div>
          <div className="text-sm muted">{label}</div>
          <div className="text-2xl font-semibold" style={{ color: color || 'var(--silver)' }}>{value}</div>
        </div>
        <div className="text-sm small muted">
          {delta !== undefined ? (delta >= 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`) : ''}
        </div>
      </div>
      {tooltip && <div className="mt-2 text-xs muted">{tooltip}</div>}
    </div>
  );
}
