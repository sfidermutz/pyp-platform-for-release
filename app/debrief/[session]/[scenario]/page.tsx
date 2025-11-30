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

export default function FullDebriefPage({ params }: { params: { session: string, scenario: string }}) {
  const { session, scenario } = params;
  const [debrief, setDebrief] = useState<any | null>(null);
  const [scenarioData, setScenarioData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    try {
      const key = `pyp_debrief_${session}_${scenario}`;
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (raw) {
        setDebrief(JSON.parse(raw));
      } else {
        setDebrief(null);
      }

      (async () => {
        try {
          const rawUrl = `/data/scenarios/${encodeURIComponent(scenario)}.json`;
          const r = await fetch(rawUrl);
          if (r.ok) {
            const content = await r.json();
            setScenarioData(content);
          } else {
            const RAW_BASE = 'https://raw.githubusercontent.com/sfidermutz/pyp-platform-for-release/main';
            const r2 = await fetch(`${RAW_BASE}/data/scenarios/${encodeURIComponent(scenario)}.json`);
            if (r2.ok) {
              const c2 = await r2.json();
              setScenarioData(c2);
            } else {
              setScenarioData(null);
            }
          }
        } catch (e) {
          setScenarioData(null);
        } finally {
          setLoading(false);
        }
      })();
    } catch (e) {
      setLoading(false);
    }
  }, [session, scenario]);

  useEffect(() => {
    // ensure top-of-page focus for screen readers on mount
    try {
      const el = document.getElementById('debrief-header');
      if (el) el.focus();
    } catch (e) {}
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading debrief…</div>;
  }

  if (!debrief) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold">Debrief not found</h1>
          <p className="mt-4 text-slate-400">No local debrief data was found for this session & scenario. Please complete the scenario first or check logs.</p>
          <div className="mt-6">
            <button onClick={() => router.push('/coins')} className="px-4 py-2 bg-sky-500 rounded text-black">Back to Coins</button>
          </div>
        </div>
      </main>
    );
  }

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
      {/* Sticky header */}
      <div id="debrief-header" className="fixed left-0 right-0 top-0 z-40 bg-[#071017] border-b border-slate-800 p-4 flex items-center justify-between" tabIndex={-1}>
        <div>
          <div className="text-xs text-slate-500">PYP: STRATEGIC EDGE · DEMO</div>
          <div className="text-lg font-bold mt-1">{scenarioData?.title ?? scenario}</div>
          <div className="text-sm text-slate-400 mt-1">{scenarioData?.role ?? ''} · {scenarioData?.year ?? ''}</div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/coins')} className="px-4 py-2 bg-slate-700 rounded">Back to Coins</button>
          <a href="/demo_certificate.pdf" className="px-4 py-2 bg-green-500 rounded text-black" target="_blank" rel="noopener noreferrer">Download Placeholder Cert</a>
        </div>
      </div>

      {/* Spacer to account for sticky header height */}
      <div style={{ height: 96 }} />

      <div className="max-w-5xl mx-auto mt-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            {/* Title left blank; header already shows title */}
          </div>

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
