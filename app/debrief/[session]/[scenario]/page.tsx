// app/debrief/[session]/[scenario]/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';

function metricLabel(key: string) {
  const mapping: Record<string,string> = {
    mission_score: 'Mission',
    decision_quality: 'Decision Q',
    trust_calibration: 'Trust',
    information_advantage: 'Info Adv.',
    bias_awareness: 'Bias Aw.',
    cognitive_adaptability: 'Cogn. Adapt.',
    CRI: 'CRI',
    confidence_alignment: 'Conf Align'
  };
  return mapping[key] ?? key;
}

export default function FullDebriefPage({ params }: { params: { session?: string, scenario?: string }}) {
  const router = useRouter();

  // Route params (may be undefined or the literal string "undefined")
  const initialSession = params?.session ?? null;
  const initialScenario = params?.scenario ?? null;

  // Resolved values (we attempt to fallback to localStorage if the route params are missing)
  const [resolvedSession, setResolvedSession] = useState<string | null>(initialSession ?? null);
  const [resolvedScenario, setResolvedScenario] = useState<string | null>(initialScenario ?? null);

  const [debrief, setDebrief] = useState<any | null>(null);
  const [scenarioData, setScenarioData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Treat the literal string "undefined" as missing
  function isMissingValue(v: string | null | undefined) {
    return !v || v === 'undefined';
  }

  // Attempt to resolve missing session/scenario from localStorage or location
  useEffect(() => {
    // If the route params are fine, keep them. Otherwise attempt local fallbacks.
    let didResolve = false;
    if (typeof window !== 'undefined') {
      try {
        // If session missing/invalid, try pyp_session_id in localStorage
        if (isMissingValue(resolvedSession)) {
          const stored = localStorage.getItem('pyp_session_id');
          if (stored) {
            setResolvedSession(stored);
            didResolve = true;
          }
        }
        // If scenario missing/invalid, try to deduce scenario from location path or localStorage keys
        if (isMissingValue(resolvedScenario)) {
          // attempt: if URL contains a trailing segment we can use it; otherwise check localStorage keys
          try {
            const parts = window.location.pathname.split('/').filter(Boolean);
            // last segment might be scenario if shape matches
            if (parts.length >= 3) {
              // e.g., /debrief/<session>/<scenario>
              const maybeScenario = parts[parts.length - 1];
              if (maybeScenario && maybeScenario !== 'undefined') {
                setResolvedScenario(maybeScenario);
                didResolve = true;
              }
            }
            // fallback: scan localStorage for a debrief related key
            if (isMissingValue(resolvedScenario)) {
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                // keys we store: pyp_debrief_<session>_<scenario>
                const m = k.match(/^pyp_debrief_[^_]+_(.+)$/);
                if (m && m[1]) {
                  setResolvedScenario(m[1]);
                  didResolve = true;
                  break;
                }
              }
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore localStorage errors
      }
    }

    // If we didn't resolve anything, keep existing resolved values; fetching logic below will handle invalid params.
    // Force a re-render/attempt to load scenario after resolution attempts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Primary effect: load scenario JSON (using resolvedScenario). We wait for resolvedScenario/resolvedSession to stabilize.
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setScenarioData(null);
      try {
        const s = resolvedScenario;
        if (!s || isMissingValue(s)) {
          setScenarioData(null);
          setLoading(false);
          return;
        }

        // Try local public path first
        const rawUrl = `/data/scenarios/${encodeURIComponent(s)}.json`;
        try {
          const r = await fetch(rawUrl);
          if (r.ok) {
            const content = await r.json();
            if (!mounted) return;
            setScenarioData(content);
            setLoading(false);
            return;
          }
        } catch (e) {
          // fallthrough to raw github
        }

        // Fallback to raw github
        try {
          const RAW_BASE = 'https://raw.githubusercontent.com/sfidermutz/pyp-platform-for-release/main';
          const r2 = await fetch(`${RAW_BASE}/data/scenarios/${encodeURIComponent(s)}.json`);
          if (r2.ok) {
            const c2 = await r2.json();
            if (!mounted) return;
            setScenarioData(c2);
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore
        }

        if (mounted) setScenarioData(null);
      } catch (e) {
        if (mounted) setScenarioData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [resolvedScenario]);

  // If no local debrief snapshot is present, try to fetch persisted debrief from server (using resolvedSession/resolvedScenario)
  useEffect(() => {
    let mounted = true;
    async function loadDebrief() {
      if (!mounted) return;
      setDebrief(null);
      // try snapshot in localStorage if resolvedSession/resolvedScenario are present
      if (!isMissingValue(resolvedSession) && !isMissingValue(resolvedScenario)) {
        try {
          const key = `pyp_debrief_${resolvedSession}_${resolvedScenario}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              setDebrief(JSON.parse(raw));
            } catch (e) {
              setDebrief(null);
            }
          } else {
            // attempt server fetch
            const res = await fetch(`/api/debrief?session_id=${encodeURIComponent(resolvedSession!)}&scenario_id=${encodeURIComponent(resolvedScenario!)}`);
            if (res.ok) {
              const json = await res.json();
              const serverDebrief = json?.debrief ?? null;
              if (serverDebrief) {
                const composed = {
                  ...serverDebrief.metrics,
                  short_feedback: serverDebrief.short_feedback,
                  selections: serverDebrief.selections,
                  reflection: serverDebrief.reflection,
                };
                if (!mounted) return;
                setDebrief(composed);
                try {
                  const key2 = `pyp_debrief_${resolvedSession}_${resolvedScenario}`;
                  localStorage.setItem(key2, JSON.stringify(composed));
                } catch (e) {}
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }
    loadDebrief();
    return () => { mounted = false; };
  }, [resolvedSession, resolvedScenario]);

  // If the route params arrived as the literal string 'undefined' or are missing,
  // show a friendly UI that tries to help the user recover.
  const invalidParams = isMissingValue(resolvedSession) || isMissingValue(resolvedScenario);

  useEffect(() => {
    try { const el = document.getElementById('debrief-header'); if (el) el.focus(); } catch (e) {}
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading debrief…</div>;
  }

  if (invalidParams) {
    // Offer recovery path: use the locally-stored session (if present) to construct a working debrief URL
    const localSession = (typeof window !== 'undefined') ? (() => {
      try { return localStorage.getItem('pyp_session_id'); } catch (e) { return null; }
    })() : null;

    const tryUseLocalSession = () => {
      if (localSession && resolvedScenario && !isMissingValue(resolvedScenario)) {
        router.push(`/debrief/${localSession}/${resolvedScenario}`);
      } else if (localSession && initialScenario && !isMissingValue(initialScenario)) {
        // initial scenario param might be present even if resolvedScenario wasn't set yet
        router.push(`/debrief/${localSession}/${initialScenario}`);
      } else {
        // fallback: go to coins
        router.push('/coins');
      }
    };

    return (
      <main className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold">Invalid Debrief URL</h1>
          <p className="mt-4 text-slate-400">This debrief URL is missing a session or scenario identifier. Please start the scenario from the Coins or Module page.</p>

          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => router.push('/coins')} className="px-4 py-2 bg-sky-500 rounded text-black">Back to Coins</button>

            {localSession ? (
              <button onClick={tryUseLocalSession} className="px-4 py-2 bg-slate-700 rounded text-white">
                Use my current session
              </button>
            ) : (
              <button onClick={() => router.push('/admin/debug')} className="px-4 py-2 bg-slate-700 rounded text-white">
                Debug / Start scenario
              </button>
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Tip: If you recently completed a scenario, your session id may be stored in your browser (used by "Use my current session"). If you want to share a debrief link, start the scenario from the Coins page and copy the debrief link after the run completes.
          </div>
        </div>
      </main>
    );
  }

  if (!debrief) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold">Debrief not found</h1>
          <p className="mt-4 text-slate-400">No debrief data was found for this session & scenario. Please complete the scenario first or check logs.</p>
          <div className="mt-6">
            <button onClick={() => router.push('/coins')} className="px-4 py-2 bg-sky-500 rounded text-black">Back to Coins</button>
          </div>
        </div>
      </main>
    );
  }

  // Render debrief (unchanged)
  const metrics = [
    { key: 'decision_quality', value: debrief.decision_quality ?? 0 },
    { key: 'trust_calibration', value: debrief.trust_calibration ?? 0 },
    { key: 'information_advantage', value: debrief.information_advantage ?? 0 },
    { key: 'bias_awareness', value: debrief.bias_awareness ?? 0 },
    { key: 'cognitive_adaptability', value: debrief.cognitive_adaptability ?? 0 },
    { key: 'confidence_alignment', value: debrief.confidence_alignment ?? 0 },
  ];
  const radarData = metrics.map(m => ({ metric: metricLabel(m.key), value: m.value }));

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div id="debrief-header" className="fixed left-0 right-0 top-0 z-40 bg-[#071017] border-b border-slate-800 p-4 flex items-center justify-between" tabIndex={-1}>
        <div>
          <div className="text-xs text-slate-500">PYP: STRATEGIC EDGE · DEMO</div>
          <div className="text-lg font-bold mt-1">{scenarioData?.title ?? resolvedScenario}</div>
          <div className="text-sm text-slate-400 mt-1">{scenarioData?.role ?? ''} · {scenarioData?.year ?? ''}</div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/coins')} className="px-4 py-2 bg-slate-700 rounded">Back to Coins</button>
          <a href="/demo_certificate.pdf" className="px-4 py-2 bg-green-500 rounded text-black" target="_blank" rel="noopener noreferrer">Download Placeholder Cert</a>
        </div>
      </div>

      <div style={{ height: 96 }} />
      <div className="max-w-5xl mx-auto mt-4">
        <div className="flex items-center justify-between mb-8">
          <div />
          <div className="text-right">
            <div className="text-sm text-slate-300">Mission Score</div>
            <div className="text-5xl font-extrabold text-sky-400">{debrief.mission_score}</div>
            <div className="text-sm text-slate-300 mt-1">{debrief.short_feedback?.line1}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 bg-[#071017] rounded-xl border border-slate-800 p-6">
            <h2 className="text-xl font-semibold">Scenario Summary</h2>
            <p className="mt-3 text-slate-300">{scenarioData?.situation ?? scenarioData?.narrative}</p>

            <div className="mt-6 space-y-4">
              {[1,2,3].map((i)=> {
                const dp = i === 1 ? scenarioData?.dp1 : i === 2 ? scenarioData?.dp2 : scenarioData?.dp3;
                return (
                  <div key={i} className="rounded-md p-4 border border-slate-700 bg-[#071016]">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{`DP${i}`}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider">Locked</div>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{dp?.narrative ?? dp?.stem}</p>
                    <div className="mt-3 grid gap-3">
                      {(dp?.options ?? []).map((opt: any) => {
                        const isSelected = (debrief?.selections && Object.values(debrief?.selections).find((s:any) => s?.optionId === opt.id));
                        return (
                          <div key={opt.id} className={`text-left w-full px-3 py-3 rounded-md border ${isSelected ? 'border-sky-500 bg-sky-700/10' : 'border-slate-700'}`}>
                            <div className="text-sm">{opt.text}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#071017] rounded-xl border border-slate-800 p-6">
            <h2 className="text-xl font-semibold">Core Metrics</h2>
            <div className="w-full h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={30} domain={[0,100]} />
                  <Radar name="Metrics" dataKey="value" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {metrics.map(m => (
                <div key={m.key} className="bg-[#061017] border border-slate-700 rounded p-3 text-center">
                  <div className="text-xs text-slate-400">{metricLabel(m.key)}</div>
                  <div className="text-lg font-bold text-sky-300">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#071017] rounded-xl border border-slate-800 p-6">
          <h2 className="text-xl font-semibold">Reflection</h2>
          <div className="mt-3 text-slate-300">
            <p className="whitespace-pre-wrap">{(debrief?.reflection ?? '')}</p>
          </div>

          <div className="mt-6 text-sm text-slate-400">
            <div>{debrief?.short_feedback?.line1}</div>
            <div className="mt-1">{debrief?.short_feedback?.line2}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
