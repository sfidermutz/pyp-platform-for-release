import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

type Props = { data: { metric: string; value: number }[]; title?: string };

export default function RadarTile({ data, title }: Props) {
  const chartData = data.map(d => ({ subject: d.metric, A: Math.max(0, Math.min(100, d.value)) }));
  return (
    <div className="panel" style={{ width: '100%', height: 320 }}>
      {title && <div className="h1 text-lg mb-2">{title}</div>}
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--silver)' }} />
          <PolarRadiusAxis angle={30} domain={[0,100]} />
          <Radar name="you" dataKey="A" stroke="#7da9ff" fill="#7da9ff" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
