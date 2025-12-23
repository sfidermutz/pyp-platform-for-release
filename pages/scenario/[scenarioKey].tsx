// pages/scenario/[scenarioKey].tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ScenarioStepper from '../../components/ScenarioStepper';
import DebriefModal from '../../components/DebriefModal';
import { computeScenarioMetrics, computeMissionScore } from '../../lib/metrics';
import { buildDebriefNarrative } from '../../lib/narrative';

export default function ScenarioPage() {
  const router = useRouter();
  const { scenarioKey } = router.query;
  const [scenario, setScenario] = useState<any>(null);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [debriefData, setDebriefData] = useState<any>(null);
  const [locked, setLocked] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function ensureSessionFromToken(token: string | null) {
    if (!token) return false;
    try {
      const res = await fetch('/api/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ token })
      });
      return res.ok;
    } catch (e) {
      console.warn('failed to create session', e);
      return false;
    }
  }

  async function fetchScenarioWithSession(id: string, token: string | null) {
    let resp = await fetch(`/api/scenario/${id}`, { credentials: 'same-origin' });
    if (resp.status === 403 && token) {
      const created = await ensureSessionFromToken(token);
      if (created) {
        resp = await fetch(`/api/scenario/${id}`, { credentials: 'same-origin' });
      }
    }
    return resp;
  }

  useEffect(() => {
    let active = true;
    async function loadScenario() {
      if (!scenarioKey) return;
      setLoading(true);
      setLocked(false);
      setError(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('pyp_token') : null;
      try {
        // try to confirm session first
        let hasSession = false;
        try {
          const meRes = await fetch('/api/auth/me', { credentials: 'same-origin' });
          const meJson = await meRes.json();
          hasSession = Boolean(meJson?.authenticated);
        } catch (e) {
          hasSession = false;
        }
        if (!hasSession && token) {
          await ensureSessionFromToken(token);
        }

        const resp = await fetchScenarioWithSession(String(scenarioKey), token);
        if (!active) return;
        if (resp.ok) {
          const data = await resp.json();
          setScenario(data);
          setLocked(false);
        } else if (resp.status === 403) {
          setLocked(true);
          setScenario(null);
        } else if (resp.status === 404) {
          setError('Scenario not found');
        } else {
          setError('Failed to load scenario');
        }
      } catch (e) {
        if (active) {
          setError(String(e));
          setScenario(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadScenario();
    return () => { active = false; };
  }, [scenarioKey]);

  function handleComplete(run:any) {
    const chosenOptions = [run.decisions[0], run.decisions[1], run.decisions[2]];
    const metrics = computeScenarioMetrics(chosenOptions);
    const missionScore = computeMissionScore(metrics);
    const narrative = buildDebriefNarrative(metrics, missionScore);
    setDebriefData({ metrics, missionScore, narrative });
    setDebriefOpen(true);

    // Post telemetry to ingest endpoint (stubbed)
    fetch('/telemetry/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_run_id: `run-${Date.now()}`,
        persona_id: 'synthetic-unknown',
        session_id: `sess-${Date.now()}`,
        scenario_id: scenarioKey,
        decisions: run.decisions.map((d:any) => ({
          option_id_initial: d.id || d.option_id,
          option_id_final: d.id || d.option_id,
          changed_before_next: false,
          confidence_value: run.confidence || 3,
          timestamp_opened: new Date().toISOString(),
          timestamp_next_clicked: new Date().toISOString(),
          time_on_decision_ms: 1000
        })),
        reflection_1_text: run.reflection1,
        reflection_2_text: run.reflection2,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString()
      })
    }).catch(() => { /* ignore telemetry errors */ });
  }

  async function handleTokenSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await ensureSessionFromToken(tokenInput || null);
    if (ok) {
      try { localStorage.setItem('pyp_token', tokenInput); } catch (err) {}
      window.location.reload();
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/logout', { credentials: 'same-origin' });
    } catch (e) {}
    window.location.href = '/';
  }

  if (loading) return <div className="p-8">Loading scenario…</div>;
  if (locked) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold">Sign in to view this scenario</h1>
        <p className="mt-2 text-sm text-slate-300">Enter a valid access token to create a session.</p>
        <form className="mt-4 space-y-3" onSubmit={handleTokenSubmit}>
          <input
            className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2"
            placeholder="Access token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
          />
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 rounded bg-sky-500 text-black font-semibold">Create session</button>
            <button type="button" onClick={handleLogout} className="px-4 py-2 rounded border border-slate-500 text-slate-200">Sign out</button>
          </div>
        </form>
      </div>
    );
  }
  if (error) return <div className="p-8 text-rose-400">{error}</div>;
  if (!scenario) return <div className="p-8">Loading scenario…</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="h1 text-2xl">{scenario.operation_name || scenario.short_name} — {scenario.scenario_id || scenarioKey}</h1>
        <button onClick={handleLogout} className="px-3 py-2 rounded border border-slate-500 text-sm">Sign out</button>
      </div>
      <div className="mt-4 panel">
        <div className="muted">Situation</div>
        <div className="mt-2">{scenario.scenario_intro || scenario.situation}</div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <ScenarioStepper scenario={scenario} onComplete={handleComplete} />
        </div>
        <div>
          <div className="panel">
            <div className="muted">Learning objective</div>
            <div className="mt-2">{scenario.scenario_lo_text || scenario.scenario_LO || scenario.scenario_lo}</div>
          </div>

          <div className="mt-4 panel">
            <div className="muted">Authoring notes</div>
            <div className="mt-2 small muted">Tags: {(scenario.tags || []).join(', ')}</div>
          </div>
        </div>
      </div>

      <DebriefModal open={debriefOpen} onClose={() => setDebriefOpen(false)} metrics={debriefData?.metrics || {}} narrative={debriefData?.narrative || ''} />
    </div>
  );
}
