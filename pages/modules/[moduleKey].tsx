// pages/modules/[moduleKey].tsx
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import MetricTile from '../../components/MetricTile';
import RadarTile from '../../components/RadarTile';
import AdversaryLens from '../../components/AdversaryLens';
import { computeMissionScore } from '../../lib/metrics';

export default function ModulePage() {
  const router = useRouter();
  const { moduleKey } = router.query;
  const [moduleData, setModuleData] = useState<any>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<any[]>([]);
  const [missionScore, setMissionScore] = useState<number>(0);

  useEffect(() => {
    if (!moduleKey) return;
    fetch(`/api/scenarios/${moduleKey}`)
      .then(r => r.json())
      .then(d => {
        setModuleData(d);
        // Use a simple example metrics set so UI renders even without telemetry
        const metrics = [
          { metric: 'DecisionQuality', value: 60 },
          { metric: 'InformationAdvantage', value: 55 },
          { metric: 'TrustCalibration', value: 65 },
          { metric: 'CognitiveAdaptability', value: 50 }
        ];
        setSelectedMetrics(metrics);
        setMissionScore(computeMissionScore({
          DecisionQuality: metrics[0].value,
          InformationAdvantage: metrics[1].value,
          TrustCalibration: metrics[2].value,
          CognitiveAdaptability: metrics[3].value
        }));
      })
      .catch(() => {
        // Graceful fallback if API isn't available
        setModuleData({ module_title: String(moduleKey || ''), scenarios: [] });
      });
  }, [moduleKey]);

  if (!moduleData) return <div className="p-8">Loading module…</div>;

  return (
    <div className="p-8">
      <h1 className="h1 text-2xl">{moduleData.module_title || String(moduleKey)} — Module Dashboard</h1>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <MetricTile label="Mission Score" value={missionScore} tooltip="Aggregated mission score" color="#7da9ff"/>
            <MetricTile label="Decision Quality" value={selectedMetrics[0]?.value || 0} />
            <MetricTile label="Trust Calibration" value={selectedMetrics[2]?.value || 0} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <RadarTile data={selectedMetrics} title="Core Metrics Radar" />
            <div className="panel">
              <h3 className="text-lg">Trends</h3>
              <div className="muted mt-2">Trend charts placeholder — wire to telemetry aggregates when available.</div>
            </div>
          </div>
        </div>

        <div>
          <AdversaryLens trigger="ADV_ESCALATE_HIGH" message="Adversary lens: a hostile actor could try to draw you into stronger responses by creating sharp incidents. Pause and check options." />
          <div className="mt-4 panel">
            <h3 className="h1 text-lg">Challenge Coin</h3>
            <div className="mt-2">Progress: ⭐⭐⭐☆☆ (3/5)</div>
          </div>
        </div>
      </div>

      <div className="mt-6 panel">
        <h3 className="h1 text-lg">Scenarios</h3>
        <div className="mt-4 grid gap-3">
          {(moduleData.scenarios || []).map((s:any) => (
            <a key={s.scenario_id || s.scenario_key || s.operation_name} href={`/scenario/${s.scenario_id || s.scenario_key}`} className="block p-3 border-b border-gray-800">
              <div className="font-semibold">{s.operation_name || s.short_name} — {s.scenario_id || s.scenario_key}</div>
              <div className="muted small mt-1">{s.scenario_intro || s.summary || 'No summary available'}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
