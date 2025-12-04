import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import MetricTile from '../../components/MetricTile';
import RadarTile from '../../components/RadarTile';
import AdversaryLens from '../../components/AdversaryLens';
import { computeMissionScore } from '../../lib/metrics';

export default function ModulePage() {
  const router = useRouter();
  const { moduleKey } = router.query;
 codex/confirm-repository-access-permissions-08od5l
  const moduleKeyValue = Array.isArray(moduleKey) ? moduleKey[0] : moduleKey;
  const defaultMetrics = [
    { metric: 'DecisionQuality', value: 60 },
    { metric: 'InformationAdvantage', value: 55 },
    { metric: 'TrustCalibration', value: 65 },
    { metric: 'CognitiveAdaptability', value: 50 }
  ];

  const [moduleData, setModuleData] = useState<any>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<any[]>(defaultMetrics);
  const [missionScore, setMissionScore] = useState<number>(
    computeMissionScore({
      DecisionQuality: defaultMetrics[0].value,
      InformationAdvantage: defaultMetrics[1].value,
      TrustCalibration: defaultMetrics[2].value,
      CognitiveAdaptability: defaultMetrics[3].value
    })
  );

  useEffect(() => {
    if (!moduleKeyValue) return;

    fetch(`/api/scenarios/${moduleKeyValue}`)
      .then(r => r.json())
      .then(d => {
        setModuleData(d);
        setSelectedMetrics(defaultMetrics);
        setMissionScore(
          computeMissionScore({
            DecisionQuality: defaultMetrics[0].value,
            InformationAdvantage: defaultMetrics[1].value,
            TrustCalibration: defaultMetrics[2].value,
            CognitiveAdaptability: defaultMetrics[3].value
          })
        );
      });
  }, [moduleKeyValue]);

  const [moduleData, setModuleData] = useState<any>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<any[]>([]);
  const [missionScore, setMissionScore] = useState<number>(0);

  useEffect(() => {
    if (!moduleKey) return;
    fetch(`/api/scenarios/${moduleKey}`)
      .then(r => r.json())
      .then(d => {
        setModuleData(d);
        const metrics = [
          {metric: 'DecisionQuality', value: 60},
          {metric: 'InformationAdvantage', value: 55},
          {metric: 'TrustCalibration', value: 65},
          {metric: 'CognitiveAdaptability', value: 50}
        ];
        setSelectedMetrics(metrics);
        setMissionScore(computeMissionScore({DecisionQuality:60, InformationAdvantage:55, TrustCalibration:65, CognitiveAdaptability:50}));
      });
  }, [moduleKey]);
 main

  if (!moduleData) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="h1 text-2xl">{moduleData.module_title || moduleKeyValue} — Module Dashboard</h1>
 codex/confirm-repository-access-permissions-08od5l
      <h1 className="h1 text-2xl">{moduleData.module_title || moduleKeyValue} — Module Dashboard</h1>

      <h1 className="h1 text-2xl">{moduleData.module_title || moduleKey} — Module Dashboard</h1>
 main
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <MetricTile label="Mission Score" value={missionScore} tooltip="Aggregated mission score" color="#7da9ff"/>
            <MetricTile label="Decision Quality" value={selectedMetrics[0]?.value ?? 0} />
            <MetricTile label="Trust Calibration" value={selectedMetrics[2]?.value ?? 0} />
 codex/confirm-repository-access-permissions-08od5l
            <MetricTile label="Decision Quality" value={selectedMetrics[0]?.value ?? 0} />
            <MetricTile label="Trust Calibration" value={selectedMetrics[2]?.value ?? 0} />

            <MetricTile label="Decision Quality" value={selectedMetrics[0].value} />
            <MetricTile label="Trust Calibration" value={selectedMetrics[2].value} />
 main
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <RadarTile data={selectedMetrics} title="Core Metrics Radar" />
            <div className="panel">
              <h3 className="text-lg">Trends</h3>
              <div className="muted mt-2">Trend charts placeholder — wire to telemetry aggregates.</div>
            </div>
          </div>

        </div>

        <div>
          <AdversaryLens trigger="ADV_ESCALATE_HIGH" message="Adversary lens: A hostile actor could try to draw you into stronger responses by creating sharp, emotional incidents..." />
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
            <a key={s.scenario_key} href={`/scenario/${s.scenario_key}`} className="block p-3 border-b border-gray-800">
              <div className="font-semibold">{s.short_name} — {s.scenario_key}</div>
              <div className="muted small mt-1">{s.summary || s.scenario_intro || 'No summary'}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
