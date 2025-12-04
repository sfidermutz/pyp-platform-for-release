// app/debrief/[session]/[scenario]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';

type Params = { params: { session?: string; scenario?: string } };

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

export default function FullDebriefPage({ params }: Params) {
  const router = useRouter();
  const initialSession = params?.session ?? null;
  const initialScenario = params?.scenario ?? null;

  const [resolvedSession, setResolvedSession] = useState<string | null>(initialSession ?? null);
  const [resolvedScenario, setResolvedScenario] = useState<string | null>(initialScenario ?? null);

  const [debrief, setDebrief] = useState<any | null>(null);
  const [scenarioData, setScenarioData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [certificateBusy, setCertificateBusy] = useState(false);
  const [certificateResult, setCertificateResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  function isMissingValue(v: string | null | undefined) {
    return !v || v === 'undefined';
  }

  // try to resolve missing params from localStorage or URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (isMissingValue(resolvedSession)) {
        const stored = localStorage.getItem('pyp_session_id');
        if (stored) setResolvedSession(stored);
      }
      if (isMissingValue(resolvedScenario)) {
        const parts = window.location.pathname.split('/').filter(Boolean);
        if (parts.length >= 3) {
          const maybe = parts[parts.length - 1];
          if (maybe && maybe !== 'undefined') setResolvedScenario(maybe);
        } else {
          // scan localStorage for pyp_debrief_<session>_<scenario>
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            const m = k.match(/^pyp_debrief_[^_]+_(.+)$/);
            if (m && m[1]) { setResolvedScenario(m[1]); break; }
          }
        }
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load scenario JSON
  useEffect(() => {
    let mounted = true;
    async function loadScenario() {
      setLoading(true);
      setScenarioData(null);
      try {
        const s = resolvedScenario;
        if (!s || isMissingValue(s)) {
          setScenarioData(null);
          setLoading(false);
          return;
        }
        // try local public path
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
        } catch (e) {}
        // fallback to raw github
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
        } catch (e) {}
        if (mounted) setScenarioData(null);
      } catch (e) {
        if (mounted) setScenarioData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadScenario();
    return () => { mounted = false; };
  }, [resolvedScenario]);

  // load debrief (local then server)
  useEffect(() => {
    let mounted = true;
    async function loadDebrief() {
      setDebrief(null);
      if (isMissingValue(resolvedSession) || isMissingValue(resolvedScenario)) return;
      try {
        const key = `pyp_debrief_${resolvedSession}_${resolvedScenario}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            setDebrief(JSON.parse(raw));
            return;
          } catch {}
        }
        const res = await fetch(`/api/debrief?session_id=${encodeURIComponent(resolvedSession!)}&scenario_id=${encodeURIComponent(resolvedScenario!)}`);
        if (res.ok) {
          const json = await res.json();
          const serverDebrief = json?.debrief ?? null;
          if (serverDebrief) {
            const composed = {
              ...serverDebrief.metrics,
              short_feedback: serverDebrief.short_feedback,
              selections: serverDebrief.selections,
              reflection: serverDebrief.reflection
            };
            if (!mounted) return;
            setDebrief(composed);
            try { localStorage.setItem(key, JSON.stringify(composed)); } catch {}
            return;
          }
        }
      } catch (e) {
        // ignore
      }
    }
    loadDebrief();
    return () => { mounted = false; };
  }, [resolvedSession, resolvedScenario]);

  useEffect(() => {
    try { const el = document.getElementById('debrief-header'); if (el) el.focus(); } catch (e) {}
  }, []);

  // certificate generation
  async function onGenerateCertificate() {
    if (!resolvedSession || !resolvedScenario) return;
    setCertificateBusy(true);
    setCertificateResult(null);
    setError(null);
    try {
      const resp = await fetch('/api/generate-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: resolvedSession, scenario_id: resolvedScenario })
      });
      const j = await resp.json().catch(() => ({ ok: false }));
      if (!resp.ok) {
        setCertificateResult({ ok: false, payload: j, message: j?.error ?? 'Failed generating certificate' });
      } else {
        setCertificateResult({ ok: true, payload: j, message: 'Certificate generated' });
      }
    } catch (e: any) {
      setError(String(e));
    } finally {
      setCertificateBusy(false);
    }
  }

  // share link
  function copyShareLink() {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      alert('Debrief link copied to clipboard');
    } catch (e) {
      alert('Copy failed — please copy the URL manually.');
    }
  }

  const invalidParams = isMissingValue(resolvedSession) || isMissingValue(resolvedScenario);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading debrief…</div>;
  }

  if (invalidParams) {
    const localSession = (typeof window !== 'undefined') ? (() => {
      try { return localStorage.getItem('pyp_session_id'); } catch { return null; }
    })() : null;

    const tryUseLocalSession = () => {
      if (localSession && resolvedScenario && !isMissingValue(resolvedScenario)) {
        router.push(`/debrief/${localSession}/${resolvedScenario}`);
      } else if (localSession && initialScenario && !isMissingValue(initialScenario)) {
        router.push(`/debrief/${localSession}/${initialScenario}`);
      } else {
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
              <button onClick={tryUseLocalSession} className="px-4 py-2 bg-slate-700 rounded text-white">Use my current session</button>
            ) : (
              <button onClick={() => router.push('/admin/debug')} className="px-4 py-2 bg-slate-700 rounded text-white">Debug / Start scenario</button>
            )}
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

  // prepare metrics for radar
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
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6">
        {/* main column */}
        <div>
          <header className="bg-[#071017] border border-slate-800 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{scenarioData?.title ?? resolvedScenario}</h1>
                <div className="text-sm text-slate-400 mt-1">{scenarioData?.role ?? ''} · {scenarioData?.year ?? ''}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-300">Mission Score</div>
                <div className="text-4xl font-extrabold text-sky-400">{debrief.mission_score}</div>
                <div className="text-xs text-slate-400 mt-1">{debrief.short_feedback?.line1}</div>
              </div>
            </div>
          </header>

          <section className="bg-[#071017] border border-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold">Scenario Summary</h2>
            <p className="mt-3 text-slate-300">{scenarioData?.situation ?? scenarioData?.narrative}</p>

            <div className="mt-6 space-y-4">
              {[1,2,3].map((i)=> {
                const dp = i === 1 ? scenarioData?.dp1 : i === 2 ? scenarioData?.dp2 : scenarioData?.dp3;
                const locked = true;
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
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-sm">{opt.text}</div>
                              <div className="text-xs text-slate-400">Score: {typeof opt.score === 'number' ? opt.score : '—'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-[#071017] border border-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold">Reflection</h2>
            <div className="mt-3 text-slate-300">
              <p className="whitespace-pre-wrap">{(debrief?.reflection ?? '')}</p>
            </div>

            <div className="mt-6 text-sm text-slate-400">
              <div>{debrief?.short_feedback?.line1}</div>
              <div className="mt-1">{debrief?.short_feedback?.line2}</div>
            </div>
          </section>
        </div>

        {/* right-hand metrics panel */}
        <aside className="sticky top-6">
          <div className="bg-[#071017] border border-slate-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Core Metrics</h3>
              <button onClick={copyShareLink} className="text-xs text-slate-400 underline">Share</button>
            </div>

            <div className="w-full h-56 mt-4">
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

            <div className="mt-4">
              <button
                onClick={onGenerateCertificate}
                disabled={certificateBusy}
                className={`w-full px-4 py-2 rounded-md font-semibold ${certificateBusy ? 'bg-slate-600' : 'bg-green-400 text-black'}`}
              >
                {certificateBusy ? 'Generating…' : 'Generate Certificate'}
              </button>

              {certificateResult ? (
                <div className="mt-3 text-sm">
                  {certificateResult.ok ? (
                    <div className="text-sm text-slate-200">Certificate generated. <a href={certificateResult.payload?.url ?? '/demo_certificate.pdf'} target="_blank" rel="noreferrer" className="underline text-sky-300">Open</a></div>
                  ) : (
                    <div className="text-rose-400">Failed: {certificateResult.message ?? 'unknown'}</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-[#071017] border border-slate-800 rounded-xl p-4">
            <h4 className="text-sm font-semibold">Improve next time</h4>
            <ul className="mt-3 text-sm text-slate-300 space-y-2">
              <li>- Increase decision evidence sharing with coalition partners earlier.</li>
              <li>- Be explicit about attribution confidence before public statements.</li>
              <li>- Check biases: did you favour action bias under pressure?</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
