// components/ModuleClient.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type ModuleType = {
  id?: string;
  name?: string;
  description?: string | null;
  image_path?: string | null;
  default_scenario_id?: string;
  scenario_id?: string;
  module_families?: { name?: string }[];
};

export default function ModuleClient({ module }: { module: ModuleType }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // resolve the scenario id to start: prefer explicit fields, fall back
  const scenarioToStart = ((): string => {
    return (module?.default_scenario_id || module?.scenario_id || 'HYB-01');
  })();

  async function ensureSessionAndStart() {
    setLoading(true);
    try {
      // If a session already exists, continue to scenario
      let sessionId = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;

      if (!sessionId) {
        // Attempt to create a session automatically if a token is present
        const token = typeof window !== 'undefined' ? localStorage.getItem('pyp_token') : null;
        if (!token) {
          // No token: send user to landing page to enter a token
          router.push('/');
          return;
        }

        const res = await fetch('/api/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        if (!res.ok) {
          // If create-session failed, redirect to landing page so user can re-enter token
          console.error('create-session failed', await res.text());
          router.push('/');
          return;
        }

        const json = await res.json();
        // API returns { session } or similar - try to read session id
        sessionId = json?.session?.id || json?.data?.id || json?.session_id;
        if (sessionId) {
          localStorage.setItem('pyp_session_id', sessionId);
        } else {
          // fallback: still try but let the page redirect if server requires session
          console.warn('create-session returned no session id', json);
        }
      }

      // Navigate to the scenario. Use encodeURIComponent for safety.
      router.push(`/scenario/${encodeURIComponent(scenarioToStart)}`);
    } catch (err) {
      console.error('Failed to start module', err);
      // On failure, navigate to landing as recovery
      router.push('/');
    } finally {
      setLoading(false);
    }
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
              onClick={ensureSessionAndStart}
              disabled={loading}
              className={`px-5 py-2 rounded-md font-semibold ${loading ? 'bg-slate-600 cursor-wait' : 'bg-sky-500 text-black'}`}
            >
              {loading ? 'Starting…' : 'Start Scenario'}
            </button>

            <button
              onClick={() => {
                // simple action: show details or route to coins
                router.push('/coins');
              }}
              className="px-4 py-2 rounded-md border border-slate-700 text-sm text-slate-200"
            >
              Back to Coins
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
