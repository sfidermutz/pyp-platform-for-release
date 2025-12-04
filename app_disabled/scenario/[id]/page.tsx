// app/scenario/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import ScenarioEngine from '@/components/ScenarioEngine';
import { useParams, useRouter } from 'next/navigation';

type ScenarioContent = any;

function log(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log('[ScenarioClient]', ...args);
}

/**
 * Try raw CDN/raw GitHub first (fast). If that fails, attempt scanning repo contents
 * (for older files that might use different id keys), and finally fall back to the
 * module listing API as a last-resort.
 */
async function fetchRawGithub(id: string) {
  try {
    const RAW_BASE = 'https://raw.githubusercontent.com/sfidermutz/pyp-platform-for-release/main';
    const rawUrl = `${RAW_BASE}/data/scenarios/${encodeURIComponent(id)}.json`;
    log('fetchRawGithub url', rawUrl);
    const res = await fetch(rawUrl);
    log('fetchRawGithub status', res.status);
    if (!res.ok) return null;
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      return { parsed, source: rawUrl };
    } catch (e) {
      log('fetchRawGithub parse error', e);
      return null;
    }
  } catch (e) {
    log('fetchRawGithub error', e);
    return null;
  }
}

/**
 * Scan the repo listing of data/scenarios to find a match by ID if the straightforward
 * raw fetch fails. This helps for files that use snake_case vs camelCase or have
 * inconsistent naming.
 */
async function fetchGithubScan(id: string) {
  try {
    const apiUrl = 'https://api.github.com/repos/sfidermutz/pyp-platform-for-release/contents/data/scenarios';
    log('fetchGithubScan listing', apiUrl);
    const res = await fetch(apiUrl);
    log('fetchGithubScan listing status', res.status);
    if (!res.ok) return null;
    const listing = await res.json();
    if (!Array.isArray(listing)) {
      log('fetchGithubScan listing invalid');
      return null;
    }

    const concurrency = 6;
    const jsonFiles = listing.filter((it: any) => it && it.name && it.name.toLowerCase().endsWith('.json'));

    for (let i = 0; i < jsonFiles.length; i += concurrency) {
      const batch = jsonFiles.slice(i, i + concurrency);
      const batchFetches = batch.map((item: any) =>
        fetch(item.download_url)
          .then(r => (r.ok ? r.text() : Promise.reject(new Error('fetch status ' + r.status))))
          .then(text => {
            try {
              const parsed = JSON.parse(text);
              // tolerate various ID forms
              const sid = parsed?.scenarioId ?? parsed?.scenario_id ?? parsed?.id ?? null;
              if (sid && String(sid).toLowerCase() === id.toLowerCase()) {
                // include filename in the returned object so callers can show it
                return { parsed, source: item.download_url, filename: item.name };
              }
              return null;
            } catch (pe) {
              log('fetchGithubScan parse fail for', item.name, pe);
              return null;
            }
          })
          .catch(e => {
            log('fetchGithubScan fetch fail', item.name, e);
            return null;
          })
      );

      const results = await Promise.all(batchFetches);
      for (const r of results) {
        if (r) return r;
      }
      // tiny pause to avoid rate spikes
      await new Promise((r) => setTimeout(r, 80));
    }

    return null;
  } catch (e) {
    log('fetchGithubScan error', e);
    return null;
  }
}

export default function ScenarioClientPage() {
  const params = useParams() as { id?: string | string[] | undefined };
  const router = useRouter();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = typeof rawId === 'string' ? rawId : undefined;

  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState<ScenarioContent | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceFilename, setSourceFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      setScenario(null);
      setSourceUrl(null);
      setSourceFilename(null);

      if (!id) {
        setError('No scenario id');
        setLoading(false);
        return;
      }

      log('Attempting to load scenario', id);

      // Use `any` for found so TypeScript won't complain about optional filename
      let found: any = await fetchRawGithub(id);
      if (found && found.parsed) {
        log('Loaded scenario from raw github', found.source);
        if (mounted) {
          setScenario(found.parsed);
          setSourceUrl(found.source);
          setSourceFilename(found.filename ?? null);
          setLoading(false);
        }
        return;
      }

      log('Raw github did not return scenario, trying github scan');
      found = await fetchGithubScan(id);
      if (found && found.parsed) {
        log('Loaded scenario from github scan', found.source);
        if (mounted) {
          setScenario(found.parsed);
          setSourceUrl(found.source);
          setSourceFilename(found.filename ?? null);
          setLoading(false);
        }
        return;
      }

      // 3) API fallback (module-based) — best-effort for older repo layouts
      try {
        log('Trying /api/module-scenarios fallback to find scenario by module association (best-effort)');
        const modules = ['HYB']; // extend as needed
        for (const m of modules) {
          try {
            const res = await fetch(`/api/module-scenarios?module=${encodeURIComponent(m)}`);
            if (!res.ok) {
              log('module-scenarios returned non-ok', res.status);
              continue;
            }
            const json = await res.json();
            if (json && Array.isArray(json.scenarios)) {
              const match = json.scenarios.find((s: any) => {
                const sid = s.scenario_id ?? s.filename ?? s.scenarioId ?? null;
                if (!sid) return false;
                return String(sid).toLowerCase() === id.toLowerCase() || (s.filename && s.filename.toLowerCase() === `${id.toLowerCase()}.json`);
              });
              if (match) {
                const filename = match.filename;
                if (filename) {
                  const rawUrl = `https://raw.githubusercontent.com/sfidermutz/pyp-platform-for-release/main/data/scenarios/${filename}`;
                  const r = await fetch(rawUrl);
                  if (r.ok) {
                    const t = await r.text();
                    const parsed = JSON.parse(t);
                    if (mounted) {
                      setScenario(parsed);
                      setSourceUrl(rawUrl);
                      setSourceFilename(filename);
                      setLoading(false);
                      log('Loaded scenario via api fallback from', rawUrl);
                      return;
                    }
                  }
                }
              }
            }
          } catch (e) {
            log('module-scenarios fallback error for module', m, e);
          }
        }
      } catch (e) {
        log('module-scenarios fallback outer error', e);
      }

      if (mounted) {
        setError('Scenario not found after trying github/raw and API fallbacks.');
        setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [id]);

  // Helpers to normalize older/newer schema differences
  function normScenarioId(s: any) {
    return s?.scenarioId ?? s?.scenario_id ?? s?.id ?? null;
  }
  function normModuleId(s: any) {
    return s?.moduleId ?? s?.module_id ?? s?.module ?? null;
  }
  function normTitle(s: any) {
    return s?.title ?? s?.name ?? 'Untitled Scenario';
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">Loading scenario…</div>
          <div className="text-sm text-slate-400">If this takes too long, check the browser console for diagnostics.</div>
        </div>
      </main>
    );
  }

  if (error || !scenario) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-xl px-6">
          <div className="text-lg mb-4">Scenario not found.</div>
          <div className="text-sm text-slate-400 mb-4">{error ?? 'No scenario data'}</div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/coins')}
              className="px-4 py-2 bg-sky-500 text-black rounded-md font-semibold"
            >
              Back to Coins
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Compute normalized values for display
  const scenarioId = String(normScenarioId(scenario) ?? id ?? '').trim();
  const moduleId = String(normModuleId(scenario) ?? '').trim();
  const title = String(normTitle(scenario));
  const role = scenario?.role ?? scenario?.roleName ?? '';
  const year = scenario?.year ?? scenario?.timeframe ?? '';
  const locationName = scenario?.locationName ?? scenario?.location ?? '';
  const learningOutcome = scenario?.learningOutcome ?? scenario?.learningOutcomeText ?? scenario?.scenario_LO ?? null;
  const metrics = scenario?.metrics ?? null;

  // Quick warnings for missing spec-critical fields (visible in UI during demo)
  const missingFields: string[] = [];
  if (!moduleId) missingFields.push('moduleId / module_id / module');
  if (!learningOutcome) missingFields.push('learningOutcome / learningOutcomeId / scenario_LO');
  if (!metrics) missingFields.push('metrics (core/secondary)');
  if (!scenario?.biasCatalog) missingFields.push('biasCatalog');

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-[#071017] border border-[#202933] rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400 tracking-[0.24em] uppercase">Scenario</p>
              <h1 className="text-2xl font-semibold mt-2">{title}</h1>
              <div className="mt-2 text-sm text-slate-300">
                {role ? <span className="mr-3"><strong>Role:</strong> {role}</span> : null}
                {year ? <span className="mr-3"><strong>Year:</strong> {year}</span> : null}
                {locationName ? <span className="mr-3"><strong>Location:</strong> {locationName}</span> : null}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                {moduleId ? <span className="inline-block mr-3">Module: <strong className="text-slate-100">{moduleId}</strong></span> : null}
                <span className="inline-block">ID: <strong className="text-slate-100">{scenarioId}</strong></span>
              </div>

          {learningOutcome ? (
            <div className="mt-4 p-3 rounded-md bg-[#071820] border border-slate-700">
              <div className="text-sm text-slate-300 font-medium">Learning Outcome</div>
              <div className="mt-1 text-sm text-sky-300">{learningOutcome}</div>
            </div>
          ) : null}
            </div>

            <div className="flex flex-col items-end gap-3">
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-sky-400 underline"
                >
                  View JSON
                </a>
              ) : null}

              <button
                onClick={() => router.push('/coins')}
                className="px-3 py-2 rounded-md bg-sky-500 text-black font-semibold text-sm"
              >
                Back to Coins
              </button>
            </div>
          </div>

          {/* Show a visible warning if required spec fields are missing */}
          {missingFields.length > 0 && (
            <div className="mt-6 border-l-4 border-rose-500 bg-[#2b1010] p-4 rounded-md">
              <div className="text-sm text-rose-300 font-semibold">Scenario metadata incomplete</div>
              <div className="text-xs text-slate-300 mt-1">
                This scenario is missing fields required by the PYP spec which may cause the page or analytics to appear incomplete.
              </div>
              <ul className="text-xs text-slate-300 mt-2 list-disc list-inside">
                {missingFields.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <div className="mt-2 text-xs text-slate-400">
                Tip: Edit the scenario JSON in <strong>data/scenarios/{sourceFilename ?? `${scenarioId}.json`}</strong> and add the missing keys (moduleId, learningOutcome, metrics, biasCatalog, etc.). See the repo's master spec for required fields.
              </div>
            </div>
          )}

          {/* DEBUG: hidden scenario dump (remove after debugging) */}
          <pre data-scenario-debug style={{display:'none'}}>{JSON.stringify(scenario, null, 2)}</pre>

          {/* DEBUG: forced visible Situation block (remove after debugging) */}
          {(scenario?.situation || scenario?.narrative) ? (
            <div style={{background:'#06232a', color:'#e6fffb', padding:16, borderRadius:8, border:'1px solid #0ea5a4'}}>
              <div style={{fontWeight:700, marginBottom:8, letterSpacing:1}}>SITUATION (DEBUG)</div>
              <div style={{whiteSpace:'pre-wrap'}}>{scenario.situation ?? scenario.narrative}</div>
            </div>
          ) : (
            <div style={{background:'#5b1620', color:'#ffdede', padding:12, borderRadius:6}}>
              <div>No situation/narrative found in scenario object</div>
            </div>
          )}

        </div>

        {/* Scenario Engine: keeps existing behavior */}
        <div className="bg-[#071017] border border-[#202933] rounded-xl p-6">
          <ScenarioEngine scenario={scenario} scenarioId={String(scenarioId)} />
        </div>

        {/* Helpful footer: show some metadata and where to edit */}
        <div className="text-xs text-slate-400">
          <div>Source: {sourceFilename ?? 'unknown'}</div>
          {sourceUrl ? (
            <div>
              <a href={sourceUrl} className="text-sky-400 underline" target="_blank" rel="noreferrer">Open raw JSON</a> — edit via GitHub web UI for quick fixes.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
