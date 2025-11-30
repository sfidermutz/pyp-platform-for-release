// components/ModuleClient.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Family = { name?: string };
type ModuleType = {
  id?: string;
  name?: string;
  description?: string | null;
  image_path?: string | null;
  default_scenario_id?: string;
  scenario_id?: string;
  module_families?: Family[];
  module_code?: string | null;
};

type ScenarioMeta = {
  filename?: string;
  scenario_id?: string;
  title?: string;
  role?: string;
  learningOutcome?: string;
  narrative?: string;
};

export default function ModuleClient({ module }: { module: ModuleType }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [scLoading, setScLoading] = useState<boolean>(true);
  const [scError, setScError] = useState<string | null>(null);

  const moduleCode = (module?.module_code || (module?.module_families && module.module_families[0]?.name) || module?.id || '').toString();

  useEffect(() => {
    let active = true;

    async function fetchRemoteScenariosFromGitHub(code: string) {
      try {
        const listRes = await fetch('https://api.github.com/repos/sfidermutz/pyp-platform-for-release/contents/data/scenarios');
        if (!listRes.ok) return [];
        const listing = await listRes.json();
        if (!Array.isArray(listing)) return [];

        const jsonFiles = listing.filter((it: any) => it && it.name && it.name.toLowerCase().endsWith('.json'));
        const results: ScenarioMeta[] = [];
        const concurrency = 6;

        for (let i = 0; i < jsonFiles.length; i += concurrency) {
          const batch = jsonFiles.slice(i, i + concurrency);
          const downloads = batch.map((item: any) =>
            fetch(item.download_url)
              .then(r => (r.ok ? r.text() : Promise.reject(new Error(`fetch ${item.name} ${r.status}`))))
              .then(text => {
                try {
                  const parsed = JSON.parse(text);
                  const mid = parsed?.moduleId ?? parsed?.module_id ?? parsed?.module ?? parsed?.moduleCode ?? parsed?.moduleCode;
                  if (mid && String(mid).toLowerCase() === String(code).toLowerCase()) {
                    return {
                      filename: item.name,
                      scenario_id: parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null,
                      title: parsed?.title ?? parsed?.name ?? '',
                      role: parsed?.role ?? '',
                      learningOutcome: parsed?.learningOutcome ?? parsed?.scenario_LO ?? parsed?.scenarioLO ?? '',
                      narrative: parsed?.narrative ?? parsed?.situation ?? ''
                    } as ScenarioMeta;
                  }
                  return null;
                } catch (e) {
                  return null;
                }
              })
              .catch(() => null)
          );

          const batchRes = await Promise.all(downloads);
          for (const got of batchRes) {
            if (got) results.push(got);
          }
          await new Promise((r) => setTimeout(r, 100));
        }
        return results;
      } catch (e) {
        return [];
      }
    }

    async function loadScenarios() {
      setScLoading(true);
      setScError(null);
      try {
        if (!moduleCode) {
          setScenarios([]);
          setScLoading(false);
          return;
        }
        const res = await fetch(`/api/module-scenarios?module=${encodeURIComponent(moduleCode)}`);
        const json = await res.json();
        let serverScenarios = (json && json.scenarios) ? json.scenarios : [];
        if (!Array.isArray(serverScenarios)) serverScenarios = [];

        if (serverScenarios.length > 0) {
          if (active) setScenarios(serverScenarios);
        } else {
          const remote = await fetchRemoteScenariosFromGitHub(moduleCode);
          if (active) setScenarios(remote);
        }
      } catch (e) {
        setScError(String(e));
        setScenarios([]);
      } finally {
        if (active) setScLoading(false);
      }
    }

    loadScenarios();
    return () => { active = false; };
  }, [moduleCode, module?.id]);

  // Prefetch helper: non-blocking fetch and cache scenario JSON
  function prefetchScenario(scenarioId?: string) {
    if (!scenarioId || typeof window === 'undefined') return;
    const key = `pyp_scenario_${scenarioId}`;
    try {
      if (localStorage.getItem(key)) return; // already cached
    } catch (e) {
      // ignore localStorage errors
    }

    // Try local first, then fallback to raw GitHub
    (async () => {
      try {
        const localResp = await fetch(`/data/scenarios/${encodeURIComponent(scenarioId)}.json`);
        if (localResp.ok) {
          const j = await localResp.json();
          try { localStorage.setItem(key, JSON.stringify(j)); } catch (e) { /* ignore */ }
          return;
        }
      } catch (e) {
        // ignore; try raw
      }
      try {
        const RAW_BASE = 'https://raw.githubusercontent.com/sfidermutz/pyp-platform-for-release/main';
        const r = await fetch(`${RAW_BASE}/data/scenarios/${encodeURIComponent(scenarioId)}.json`);
        if (r.ok) {
          const j = await r.json();
          try { localStorage.setItem(key, JSON.stringify(j)); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // ignore
      }
    })();
  }

  async function ensureSessionAndNavigate(scenarioId?: string) {
    if (!scenarioId) {
      console.warn('[ModuleClient] No scenario id provided to ensureSessionAndNavigate');
      return;
    }

    // Start prefetch but do not block navigation on it
    try {
      prefetchScenario(scenarioId);
    } catch (e) {
      // ignore
    }

    setLoading(true);
    try {
      let sessionId = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;
      if (!sessionId) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('pyp_token') : null;
        if (!token) {
          window.location.href = '/';
          return;
        }
        const res = await fetch('/api/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        if (!res.ok) {
          const fallback = `/scenario/${encodeURIComponent(scenarioId)}`;
          window.location.href = fallback;
          return;
        }

        const json = await res.json();
        sessionId = json?.session?.id || json?.session_id || json?.data?.id;
        if (sessionId) localStorage.setItem('pyp_session_id', sessionId);
      }

      try {
        await fetch('/api/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, event_type: 'enter_scenario', payload: { scenario_id: scenarioId }})
        });
      } catch (logErr) {
        // ignore logging failure
      }

      try {
        router.push(`/scenario/${encodeURIComponent(scenarioId)}`);
        setTimeout(() => {
          if (window.location.pathname.indexOf('/scenario/') !== 0) {
            window.location.href = `/scenario/${encodeURIComponent(scenarioId)}`;
          }
        }, 1000);
      } catch (rpErr) {
        window.location.href = `/scenario/${encodeURIComponent(scenarioId)}`;
      }
    } catch (e) {
      window.location.href = `/scenario/${encodeURIComponent(scenarioId)}`;
    } finally {
      setLoading(false);
    }
  }

  async function startDefaultScenario() {
    const scenarioToStart = (module?.default_scenario_id || module?.scenario_id || 'HYB-01');
    await ensureSessionAndNavigate(scenarioToStart);
  }

  return (
    <div className="bg-[#0b0f14] border border-[#202933] rounded-xl p-6">
      <div className="flex items-start gap-6">
        {module?.image_path ? (
          <div className="w-36 h-36 flex-shrink-0 overflow-hidden rounded-full bg-black/20 border border-slate-800">
            <img src={module.image_path} alt={module.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-36 h-36 flex-shrink-0 rounded-full bg-slate-800/40 flex items-center justify-center text-white font-semibold">
            {module?.name ? module.name.split(' ').slice(0,2).map(s=>s[0]).join('') : 'M'}
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-2xl font-bold">{module?.name ?? 'Module'}</h1>
          {module?.module_families && module.module_families.length > 0 && (
            <div className="text-xs text-slate-400 mt-1">{module.module_families.map(f=>f.name).filter(Boolean).join(' · ')}</div>
          )}
          <p className="mt-3 text-slate-300">{module?.description ?? 'No description available.'}</p>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={startDefaultScenario}
              disabled={loading}
              className={`px-5 py-2 rounded-md font-semibold ${loading ? 'bg-slate-600 cursor-wait' : 'bg-sky-500 text-black'}`}
            >
              {loading ? 'Starting…' : 'Start Default Scenario'}
            </button>

            <button
              onClick={() => { window.location.href = '/coins'; }}
              className="px-4 py-2 rounded-md border border-slate-700 text-sm text-slate-200"
            >
              Back to Coins
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Scenarios</h2>
        {scLoading ? (
          <div className="mt-4 text-slate-300">Loading scenarios…</div>
        ) : scError ? (
          <div className="mt-4 text-rose-400">Failed to load scenarios: {scError}</div>
        ) : scenarios.length === 0 ? (
          <div className="mt-4 text-slate-400">No scenarios found for this module.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {scenarios.map((s) => {
              const idForStart = s.scenario_id ?? s.filename ?? undefined;
              return (
                <div key={s.scenario_id || s.filename} className="bg-[#0b1114] border border-slate-800 rounded-md p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{s.title ?? s.scenario_id}</div>
                      {s.role ? <div className="text-xs text-slate-400 mt-1">{s.role}</div> : null}
                      {s.learningOutcome ? <div className="text-xs text-slate-300 mt-2 italic">{s.learningOutcome}</div> : null}
                      {s.narrative ? <div className="text-sm text-slate-300 mt-3 line-clamp-3">{s.narrative}</div> : null}
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <button
                        onClick={() => ensureSessionAndNavigate(idForStart)}
                        className="px-3 py-2 rounded-md bg-sky-500 text-black font-semibold"
                        disabled={!idForStart || loading}
                        title={!idForStart ? 'No scenario id available' : `Start ${s.title ?? idForStart}`}
                      >
                        Start
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
