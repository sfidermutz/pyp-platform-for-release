// app/scenario/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import ScenarioEngine from '@/components/ScenarioEngine';
import { useParams, useRouter } from 'next/navigation';

type ScenarioContent = any;

function log(...args: any[]) {
  // helper for consistent client logs
  // eslint-disable-next-line no-console
  console.log('[ScenarioClient]', ...args);
}

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

    // limit concurrency to avoid hitting rate limits
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
              const sid = parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null;
              if (sid && String(sid).toLowerCase() === id.toLowerCase()) {
                return { parsed, source: item.download_url };
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
      // slight delay to be friendly
      await new Promise((r) => setTimeout(r, 80));
    }

    return null;
  } catch (e) {
    log('fetchGithubScan error', e);
    return null;
  }
}

export default function ScenarioClientPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState<ScenarioContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      setScenario(null);

      if (!id) {
        setError('No scenario id');
        setLoading(false);
        return;
      }

      log('Attempting to load scenario', id);
      // Try raw github first
      let found = await fetchRawGithub(id);
      if (found && found.parsed) {
        log('Loaded scenario from raw github', found.source);
        if (mounted) {
          setScenario(found.parsed);
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
          setLoading(false);
        }
        return;
      }

      // If still not found, try query the application's module-scenarios API as last resort
      try {
        log('Trying /api/module-scenarios fallback to find scenario by module association (best-effort)');
        // We'll attempt to find any module that might contain the scenario, but this is heuristic
        // Not ideal, but can help in weird repo layouts. We'll just call module-scenarios for HYB (since we know)
        const modules = ['HYB']; // expand if needed
        for (const m of modules) {
          try {
            const res = await fetch(`/api/module-scenarios?module=${encodeURIComponent(m)}`);
            const json = await res.json();
            if (json && Array.isArray(json.scenarios)) {
              const match = json.scenarios.find((s: any) => {
                const sid = s.scenario_id ?? s.filename ?? null;
                return sid && String(sid).toLowerCase() === id.toLowerCase();
              });
              if (match) {
                // attempt to fetch the raw filename if available
                const filename = match.filename;
                if (filename) {
                  const rawUrl = `https://raw.githubusercontent.com/sfidermutz/pyp-platform-for-release/main/data/scenarios/${filename}`;
                  const r = await fetch(rawUrl);
                  if (r.ok) {
                    const t = await r.text();
                    const parsed = JSON.parse(t);
                    if (mounted) {
                      setScenario(parsed);
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

      // nothing worked
      if (mounted) {
        setError('Scenario not found after trying github/raw and API fallbacks.');
        setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [id]);

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
        <div className="text-center">
          <div className="text-lg mb-4">Scenario not found.</div>
          <div className="text-sm text-slate-400">{error ?? 'No scenario data'}</div>
          <div className="mt-4">
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

  // Render scenario engine with loaded scenario JSON
  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <ScenarioEngine scenario={scenario} scenarioId={id} />
      </div>
    </main>
  );
}
