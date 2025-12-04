import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ScenarioStepper from '../../components/ScenarioStepper';
import DebriefModal from '../../components/DebriefModal';
import { computeScenarioMetrics, computeMissionScore } from '../../lib/metrics';

export default function ScenarioPage() {
  const router = useRouter();
  const { scenarioKey } = router.query;
  const keyValue = Array.isArray(scenarioKey) ? scenarioKey[0] : scenarioKey;
 codex/confirm-repository-access-permissions-08od5l
  const keyValue = Array.isArray(scenarioKey) ? scenarioKey[0] : scenarioKey;

 main
  const [scenario, setScenario] = useState<any>(null);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [debriefData, setDebriefData] = useState<any>(null);

  useEffect(() => {
 codex/confirm-repository-access-permissions-08od5l
    if (!keyValue) return;
    fetch(`/api/scenario/${keyValue}`)
      .then(r=>r.json())
      .then(d => setScenario(d));
  }, [keyValue]);

    if (!scenarioKey) return;
    fetch(`/api/scenario/${scenarioKey}`)
      .then(r=>r.json())
      .then(d => setScenario(d));
  }, [scenarioKey]);
 main

  function handleComplete(run:any) {
    const chosenOptions = [run.decisions[0], run.decisions[1], run.decisions[2]];
    const metrics = computeScenarioMetrics(chosenOptions);
    const missionScore = computeMissionScore(metrics);
    const narrative = `Outcome tier ${missionScore >= 85 ? 'Exemplary' : missionScore >= 70 ? 'Success' : missionScore >=45 ? 'Partial' : 'Failure'} — MissionScore ${missionScore}. Primary drivers: DecisionQuality ${metrics.DecisionQuality || 0}.`;
    setDebriefData({ metrics, missionScore, narrative });
    setDebriefOpen(true);

    fetch('/telemetry/ingest', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
      scenario_run_id: `run-${Date.now()}`,
      persona_id: 'synthetic-unknown',
      session_id: `sess-${Date.now()}`,
      scenario_id: keyValue,
 codex/confirm-repository-access-permissions-08od5l
      scenario_id: keyValue,

      scenario_id: scenarioKey,
 main
      decisions: run.decisions.map((d:any)=>(
        {
          option_id_initial: d.id,
          option_id_final: d.id,
          changed_before_next: false,
          confidence_value: run.confidence || 3,
          timestamp_opened: new Date().toISOString(),
          timestamp_next_clicked: new Date().toISOString(),
          time_on_decision_ms: 1000
        }
      )),
      reflection_1_text: run.reflection1,
      reflection_2_text: run.reflection2,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString()
    }) }).catch(()=>{/*ignore*/});
  }

  if (!scenario) return <div className="p-8">Loading scenario...</div>;

  return (
    <div className="p-8">
      <h1 className="h1 text-2xl">{scenario.short_name} — {scenario.scenario_key}</h1>
      <div className="mt-4 panel">
        <div className="muted">Situation</div>
        <div className="mt-2">{scenario.situation || scenario.scenario_intro}</div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <ScenarioStepper scenario={scenario} onComplete={handleComplete} />
        </div>
        <div>
          <div className="panel">
            <div className="muted">Learning objective</div>
            <div className="mt-2">{scenario.scenario_lo_text || scenario.scenario_LO}</div>
          </div>

          <div className="mt-4 panel">
            <div className="muted">Authoring notes</div>
            <div className="mt-2 small muted">Tags: {(scenario.tags||[]).join(', ')}</div>
          </div>
        </div>
      </div>

      <DebriefModal open={debriefOpen} onClose={()=>setDebriefOpen(false)} metrics={debriefData?.metrics || {}} narrative={debriefData?.narrative || ''} />
    </div>
  );
}
