// components/ModuleClient.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ScenarioMeta, ModuleRecord } from '@/types/module';

type ModuleType = ModuleRecord;

export default function ModuleClient({ module }: { module: ModuleType }) {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [scLoading, setScLoading] = useState<boolean>(true);
  const [scError, setScError] = useState<string | null>(null);
  const [starting, setStarting] = useState<boolean>(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  const moduleCode = (module?.module_code || (module?.module_families && module.module_families[0]?.name) || module?.id || '').toString();

  function sortScenarios(list: ScenarioMeta[]): ScenarioMeta[] {
    const keys = ['shelf_position', 'scenario_order', 'order', 'position', 'index'];
    return [...list].sort((a, b) => {
      if (module?.default_scenario_id) {
        if (a.scenario_id === module.default_scenario_id) return -1;
        if (b.scenario_id === module.default_scenario_id) return 1;
      }
      const getNum = (s: ScenarioMeta) => {
        for (const k of keys) {
          const v = (s as any)[k];
          if (typeof v === 'number') return v;
          if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
        }
        return null;
      };
      const na = getNum(a), nb = getNum(b);
      if (na !== null && nb !== null) return (na as number) - (nb as number);
      if (na !== null) return -1;
      if (nb !== null) return 1;
      const ta = (a.title ?? a.scenario_id ?? '').toLowerCase();
      const tb = (b.title ?? b.scenario_id ?? '').toLowerCase();
      return ta.localeCompare(tb);
    });
  }

  async function fetchWithSession(url: string) {
    let resp = await fetch(url, { credentials: 'same-origin' });
    if (resp.status === 403) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pyp_token') : null;
      if (token) {
        try {
          const createRes = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ token })
          });
          if (createRes.ok) {
            resp = await fetch(url, { credentials: 'same-origin' });
          }
        } catch (e) {
          console.warn('failed to establish session', e);
        }
      }
    }
    return resp;
  }

  useEffect(() => {
    let active = true;
    async function loadScenarios() {
      setScLoading(true);
      setScError(null);
      setRepoError(null);

      try {
        if (!moduleCode) {
          setScenarios([]);
          setScLoading(false);
          return;
        }

        try {
          const idxResp = await fetch('/data/scenarios_index.json', { credentials: 'same-origin' });
          if (idxResp.ok) {
            const idxJson = await idxResp.json();
            const items = Array.isArray(idxJson.items) ? idxJson.items : [];
            const filtered = items.filter((it: any) => (String(it.module ?? '').toLowerCase() === String(moduleCode).toLowerCase()));

            const detailed: ScenarioMeta[] = [];
            for (const f of filtered) {
              const scenId = f.id ?? (f.filename?.replace('.json',''));
              try {
                const r = await fetchWithSession(`/api/scenario/${encodeURIComponent(scenId)}`);
                if (r.ok) {
                  const parsed = await r.json();
                  detailed.push({
                    filename: f.filename,
                    scenario_id: parsed?.scenario_id ?? scenId,
                    title: parsed?.title ?? parsed?.name ?? f.title ?? '',
                    role: parsed?.role ?? '',
                    learningOutcome: parsed?.learningOutcome ?? parsed?.scenario_LO ?? '',
                    narrative: parsed?.situation ?? parsed?.narrative ?? '',
                    shelf_position: parsed?.shelf_position ?? parsed?.scenario_order ?? null,
                  });
                } else if (r.status === 403) {
                  throw new Error('Unauthorized to fetch scenarios');
                }
              } catch (e) {
                console.warn('secure scenario fetch exception', e);
              }
            }

            if (active) {
              setScenarios(sortScenarios(detailed));
              setScLoading(false);
              return;
            }
          }
        } catch (idxErr) {
          console.warn('scenarios index fetch failed', String(idxErr));
        }

        const ghResp = await fetch('https://api.github.com/repos/sfidermutz/pyp-platform-for-release/contents/data/scenarios');
        if (!ghResp.ok) {
          throw new Error(`GitHub listing failed ${ghResp.status}`);
        }
        const listing = await ghResp.json();
        const jsonFiles = Array.isArray(listing) ? listing.filter((it: any) => it && it.name && it.name.toLowerCase().endsWith('.json')) : [];
        const moduleFiles = [];
        for (const item of jsonFiles) {
          try {
            const r = await fetch(item.download_url);
            if (!r.ok) continue;
            const parsed = await r.json();
            const mid = parsed?.moduleId ?? parsed?.module_id ?? parsed?.module ?? parsed?.moduleCode;
            if (mid && String(mid).toLowerCase() === String(moduleCode).toLowerCase()) {
              moduleFiles.push({ filename: item.name, id: parsed?.scenario_id ?? parsed?.id ?? item.name.replace('.json',''), title: parsed?.title ?? parsed?.name ?? '' });
            }
          } catch (e) {
            // ignore and continue
          }
        }

        const results: ScenarioMeta[] = [];
        for (const mf of moduleFiles) {
          try {
            const r = await fetchWithSession(`/api/scenario/${encodeURIComponent(mf.id)}`);
            if (!r.ok) continue;
            const parsed = await r.json();
            results.push({
              filename: mf.filename,
              scenario_id: parsed?.scenario_id ?? mf.id,
              title: parsed?.title ?? mf.title ?? '',
              role: parsed?.role ?? '',
              learningOutcome: parsed?.learningOutcome ?? parsed?.scenario_LO ?? '',
              narrative: parsed?.situation ?? parsed?.narrative ?? '',
              shelf_position: parsed?.shelf_position ?? parsed?.scenario_order ?? null
            });
          } catch (e) { /* ignore */ }
        }

        if (active) setScenarios(sortScenarios(results));
      } catch (err: any) {
        setScError(String(err));
        setScenarios([]);
      } finally {
        if (active) setScLoading(false);
      }
    }

    loadScenarios();
    return () => { active = false; };
  }, [moduleCode, module?.id]);

  function dedupeById(arr: ScenarioMeta[]) {
    const seen = new Map<string, ScenarioMeta>();
    for (const s of arr) {
      const id = String(s.scenario_id ?? s.filename ?? '');
      if (!seen.has(id)) seen.set(id, s);
    }
    return Array.from(seen.values());
  }

  // prefetch scenario via secure API (requires cookie-based session)
  function prefetchScenario(scenarioId?: string) {
    if (!scenarioId || typeof window === 'undefined') return;
    (async () => {
      try {
        const r = await fetchWithSession(`/api/scenario/${encodeURIComponent(scenarioId)}`);
        if (!r.ok) return;
        const j = await r.json();
        try { localStorage.setItem(`pyp_scenario_${scenarioId}`, JSON.stringify(j)); } catch (e) {}
      } catch (e) {}
    })();
  }

  async function ensureSessionAndNavigate(scenarioId?: string) {
    if (!scenarioId) {
      console.warn('[ModuleClient] No scenario id provided to ensureSessionAndNavigate');
      return;
    }

    try { prefetchScenario(scenarioId); } catch (e) {}
    setStarting(true);

    try {
      let sessionId: string | null = null;
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'same-origin' });
        const meJson = await meRes.json();
        if (meJson?.authenticated) sessionId = meJson.session_id || meJson.id;
      } catch (e) {}

      if (!sessionId) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('pyp_token') : null;
        if (!token) {
          window.location.href = '/';
          return;
        }
        const res = await fetch('/api/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ token })
        });

        if (!res.ok) {
          window.location.href = '/';
          return;
        }

        const json = await res.json();
        sessionId = json?.session_id || json?.session?.id || json?.data?.id || null;
      }

      try {
        await fetch('/api/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ session_id: sessionId, event_type: 'enter_scenario', payload: { scenario_id: scenarioId }})
        });
      } catch (logErr) {}

      router.push(`/scenario/${encodeURIComponent(scenarioId)}`);
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
      {/* header omitted for brevity — unchanged */}
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
            {/* grid of scenario cards (unchanged) */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {scenarios.map((s) => {
                const idForStart = s.scenario_id ?? s.filename ?? undefined;
                return (
                  <article
                    key={s.scenario_id || s.filename}
                    className="scenario-card flex flex-col h-full"
                  >
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

            {repoError ? <div className="mt-6 text-rose-400">Repo fallback error: {repoError}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
