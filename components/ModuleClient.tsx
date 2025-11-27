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
  // optional module code like "HYB" which some DBs may store
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

/**
 * ModuleClient (enhanced)
 *
 * - Displays module header, description, and image
 * - Fetches scenario list from server using /api/module-scenarios?module=<code>
 * - Renders a tidy list/grid of scenarios (title + short narrative + LO)
 * - Each scenario has a "Start" button that creates/ensures session and navigates to /scenario/{id}
 * - Keeps the original single "Start Scenario" button (starts default scenario) for quick path
 */
export default function ModuleClient({ module }: { module: ModuleType }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [scLoading, setScLoading] = useState<boolean>(true);
  const [scError, setScError] = useState<string | null>(null);

  // Resolve module code to call the API. Prefer explicit fields that may exist.
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
        if (!res.ok) {
          setScError(json?.error || 'Failed to load scenarios');
          setScenarios([]);
        } else {
          // json.scenarios is array
          if (active) setScenarios(json.scenarios ?? []);
        }
      } catch (e) {
        console.error('module scenarios fetch error', e);
        if (active) {
          setScError(String(e));
          setScenarios([]);
        }
      } finally {
        if (active) setScLoading(false);
      }
    }
    loadScenarios();
    return () => { active = false; };
  }, [moduleCode]);

  // Ensure session exists and then navigate to scenario
  async function ensureSessionAndNavigate(scenarioId: string) {
    setLoading(true);
    try {
      let sessionId = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;
      if (!sessionId) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('pyp_token') : null;
        if (!token) {
          router.push('/');
          return;
        }
        const res = await fetch('/api/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        if (!res.ok) {
          console.error('create-session failed', await res.text());
          router.push('/');
          return;
        }
        const json = await res.json();
        sessionId = json?.session?.id || json?.session_id || json?.data?.id;
        if (sessionId) localStorage.setItem('pyp_session_id', sessionId);
      }
      // optional log
      try {
        await fetch('/api/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, event_type: 'enter_scenario', payload: { scenario_id: scenarioId }})
        });
      } catch (_) {}
      router.push(`/scenario/${encodeURIComponent(scenarioId)}`);
    } catch (e) {
      console.error('ensure session and navigate error', e);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  // quick start default scenario (existing behavior)
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
              onClick={() => { router.push('/coins'); }}
              className="px-4 py-2 rounded-md border border-slate-700 text-sm text-slate-200"
            >
              Back to Coins
            </button>
          </div>
        </div>
      </div>

      {/* Module dashboard: scenario list */}
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
            {scenarios.map((s) => (
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
                      onClick={() => ensureSessionAndNavigate(s.scenario_id || s.filename)}
                      className="px-3 py-2 rounded-md bg-sky-500 text-black font-semibold"
                    >
                      Start
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
