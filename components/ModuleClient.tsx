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
  module_families?: Family[];
  module_code?: string | null;
  ects?: number | null;
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
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [scLoading, setScLoading] = useState<boolean>(true);
  const [scError, setScError] = useState<string | null>(null);
  const [starting, setStarting] = useState<boolean>(false);
  const [repoLoading, setRepoLoading] = useState<boolean>(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  const moduleCode = (module?.module_code || (module?.module_families && module.module_families[0]?.name) || module?.id || '').toString();

  useEffect(() => {
    let active = true;

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
          // no server scenarios — leave empty and allow user to load from repo
          if (active) setScenarios([]);
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

  // Remote GitHub listing fallback: load all scenario files and filter by module code
  async function loadAllRepoScenarios() {
    setRepoError(null);
    setRepoLoading(true);
    try {
      // GitHub contents API listing for the data/scenarios folder
      const listResp = await fetch('https://api.github.com/repos/sfidermutz/pyp-platform-for-release/contents/data/scenarios');
      if (!listResp.ok) throw new Error(`GitHub listing failed ${listResp.status}`);
      const listing = await listResp.json();
      if (!Array.isArray(listing)) throw new Error('Unexpected listing shape');

      const jsonFiles = listing.filter((it: any) => it && it.name && it.name.toLowerCase().endsWith('.json'));
      const results: ScenarioMeta[] = [];
      // fetch files in small batches to be polite to GitHub
      const concurrency = 6;
      for (let i = 0; i < jsonFiles.length; i += concurrency) {
        const batch = jsonFiles.slice(i, i + concurrency);
        const downloads = await Promise.all(batch.map(async (item: any) => {
          try {
            const r = await fetch(item.download_url);
            if (!r.ok) return null;
            const parsed = await r.json();
            const mid = parsed?.moduleId ?? parsed?.module_id ?? parsed?.module ?? parsed?.moduleCode ?? parsed?.moduleCode;
            if (mid && String(mid).toLowerCase() === String(moduleCode).toLowerCase()) {
              return {
                filename: item.name,
                scenario_id: parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null,
                title: parsed?.title ?? parsed?.name ?? '',
                role: parsed?.role ?? '',
                learningOutcome: parsed?.learningOutcome ?? parsed?.scenario_LO ?? '',
                narrative: parsed?.situation ?? parsed?.narrative ?? ''
              } as ScenarioMeta;
            }
            return null;
          } catch (e) {
            return null;
          }
        }));
        downloads.forEach(d => { if (d) results.push(d); });
        // small pause
        await new Promise(r => setTimeout(r, 60));
      }

      if (results.length === 0) {
        setRepoError('No scenarios found in repository for this module.');
      }
      setScenarios(results);
    } catch (e: any) {
      setRepoError(String(e?.message ?? e));
    } finally {
      setRepoLoading(false);
    }
  }

  function prefetchScenario(scenarioId?: string) {
    if (!scenarioId || typeof window === 'undefined') return;
    const key = `pyp_scenario_${scenarioId}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch (e) {}
    (async () => {
      try {
        const localResp = await fetch(`/data/scenarios/${encodeURIComponent(scenarioId)}.json`);
        if (localResp.ok) {
          const j = await localResp.json();
          try { localStorage.setItem(key, JSON.stringify(j)); } catch (e) {}
          return;
        }
      } catch (e) {}
      try {
        const RAW_BASE = 'https://raw.githubusercontent.com/sfidermutz/pyp-platform-for-release/main';
        const r = await fetch(`${RAW_BASE}/data/scenarios/${encodeURIComponent(scenarioId)}.json`);
        if (r.ok) {
          const j = await r.json();
          try { localStorage.setItem(key, JSON.stringify(j)); } catch (e) {}
        }
      } catch (e) {}
    })();
  }

  async function ensureSessionAndNavigate(scenarioId?: string) {
    if (!scenarioId) {
      console.warn('[ModuleClient] No scenario id provided to ensureSessionAndNavigate');
      return;
    }

    try {
      prefetchScenario(scenarioId);
    } catch (e) {}

    setStarting(true);
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
          window.location.href = `/scenario/${encodeURIComponent(scenarioId)}`;
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
      } catch (logErr) {}

      try {
        window.location.href = `/scenario/${encodeURIComponent(scenarioId)}`;
      } catch (rpErr) {
        window.location.href = `/scenario/${encodeURIComponent(scenarioId)}`;
      }
    } catch (e) {
      window.location.href = `/scenario/${encodeURIComponent(scenarioId)}`;
    } finally {
      setStarting(false);
    }
  }

  async function startDefaultScenario() {
    const scenarioToStart = (module?.default_scenario_id || 'HYB-PRE-01');
    await ensureSessionAndNavigate(scenarioToStart);
  }

  return (
    <div className="bg-[#0b0f14] border border-[#202933] rounded-3xl p-8 shadow-inner">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="w-28 h-28 flex-shrink-0">
          {module?.image_path ? (
            <img
              src={module.image_path}
              alt={module.name}
              className="w-full h-full object-cover rounded-full border border-slate-800"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/coins/placeholder.svg'; }}
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center text-white font-semibold text-xl">
              {module?.name ? module.name.split(' ').slice(0,2).map(s=>s[0]).join('') : 'M'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold leading-tight">{module?.name ?? 'Module'}</h1>
              <div className="mt-1 text-xs text-slate-400">
                {module?.module_families && module.module_families.length > 0 ? module.module_families.map(f=>f.name).filter(Boolean).join(' · ') : null}
              </div>
              {module?.description ? <p className="mt-3 text-slate-300 text-sm">{module.description}</p> : null}
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="inline-flex items-center gap-2">
                <div className="module-badge px-3 py-1">{module?.module_code ?? '—'}</div>
                <div className="module-badge px-3 py-1">Scenario: {module?.default_scenario_id ?? 'TBD'}</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="module-badge px-3 py-1">{module?.ects ?? '—'} ECTS</div>
                <button
                  onClick={startDefaultScenario}
                  disabled={starting}
                  className={`px-4 py-2 rounded-md font-semibold ${starting ? 'bg-slate-600' : 'bg-amber-500 text-black'}`}
                >
                  {starting ? 'Starting…' : 'Start Default Scenario'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SCENARIO LIST */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Scenarios</h2>

        {scLoading ? (
          <div className="mt-4 text-slate-300">Loading scenarios…</div>
        ) : scError ? (
          <div className="mt-4 text-rose-400">Failed to load scenarios: {scError}</div>
        ) : scenarios.length === 0 ? (
          <div className="mt-4 text-slate-400">No scenarios found for this module.</div>
        ) : (
          <div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {scenarios.map((s) => {
                const idForStart = s.scenario_id ?? s.filename ?? undefined;
                return (
                  <article key={s.scenario_id || s.filename} className="bg-[#0b1114] border border-slate-800 rounded-xl p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-sky-300 truncate">{s.title ?? s.scenario_id}</div>
                        {s.role ? <div className="text-xs text-slate-400 mt-1">{s.role}</div> : null}
                        {s.learningOutcome ? <div className="text-xs text-slate-300 mt-2 italic line-clamp-2">{s.learningOutcome}</div> : null}
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => ensureSessionAndNavigate(idForStart)}
                          className="px-3 py-2 rounded-md bg-sky-500 text-black font-semibold"
                          disabled={!idForStart}
                          title={!idForStart ? 'No scenario id available' : `Start ${s.title ?? idForStart}`}
                        >
                          Start
                        </button>
                      </div>
                    </div>

                    {s.narrative ? <p className="mt-3 text-sm text-slate-300 line-clamp-3">{s.narrative}</p> : null}

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-slate-400">ID: <span className="text-slate-200">{s.scenario_id ?? s.filename}</span></div>
                      <div className="text-xs text-slate-400">Role: <span className="text-slate-200">{s.role ?? '—'}</span></div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* If repo fallback available or desired */}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => loadAllRepoScenarios()}
                disabled={repoLoading}
                className={`px-4 py-2 rounded-md ${repoLoading ? 'bg-slate-600' : 'bg-sky-500 text-black'}`}
                title="Load all scenarios for this module from the repository"
              >
                {repoLoading ? 'Loading repo scenarios…' : 'Load all scenarios from repo'}
              </button>
              {repoError ? <div className="text-rose-400 text-sm">{repoError}</div> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
