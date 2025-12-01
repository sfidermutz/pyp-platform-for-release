// app/coins/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Family = { name: string; code: string };
type ModuleRecord = {
  id: string;
  name: string;
  description: string | null;
  shelf_position: number | null;
  is_demo: boolean;
  module_families: Family[];
  image_path?: string | null;
  default_scenario_id?: string | null;
  module_code?: string | null;
};

export default function CoinsPage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pyp_token') : null;
    if (!token) {
      router.push('/');
      return;
    }
    fetchModules();

    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;
    if (sessionId) {
      fetch('/api/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, event_type: 'page_view', payload: { page: 'coins' } })
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchModules() {
    setLoading(true);
    setFetchError(null);

    try {
      // NOTE: do not request `ects` (some installs do not have that column).
      const { data, error } = await supabase
        .from('modules')
        .select(`id, name, description, shelf_position, is_demo, image_path, default_scenario_id, module_families ( name, code ), module_code`)
        .order('shelf_position', { ascending: true });

      setLoading(false);
      if (error) {
        console.error('fetch modules error', error);
        setFetchError(error.message || 'Failed to fetch modules');
        setModules([]);
        return;
      }

      const normalized: ModuleRecord[] = (data ?? []).map((m: any) => {
        const fam = m.module_families;
        let families: Family[] = [];

        if (Array.isArray(fam)) {
          families = fam.map((f: any) => ({ name: String(f?.name ?? ''), code: String(f?.code ?? '') }));
        } else if (fam && typeof fam === 'object') {
          families = [{ name: String(fam.name ?? ''), code: String(fam.code ?? '') }];
        } else {
          families = [];
        }

        return {
          id: String(m.id),
          name: String(m.name ?? ''),
          description: m.description ?? null,
          shelf_position: m.shelf_position ?? null,
          is_demo: Boolean(m.is_demo ?? false),
          module_families: families,
          image_path: m.image_path ?? null,
          default_scenario_id: m.default_scenario_id ?? null,
          module_code: m.module_code ?? null
        };
      });

      setModules(normalized);
    } catch (e: any) {
      console.error('fetchModules exception', e);
      setFetchError(String(e?.message ?? e));
      setLoading(false);
      setModules([]);
    }
  }

  async function openModuleDashboard(m: ModuleRecord) {
    try {
      let sessionId = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;
      if (!sessionId) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('pyp_token') : null;
        if (!token) { router.push('/'); return; }
        const res = await fetch('/api/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        if (!res.ok) { router.push('/'); return; }
        const json = await res.json();
        sessionId = json?.session?.id || json?.session_id || null;
        if (sessionId) localStorage.setItem('pyp_session_id', sessionId);
      }

      await fetch('/api/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, event_type: 'enter_module', payload: { module_id: m.id, module_code: m.module_code }})
      }).catch(()=>{});

      router.push(`/module/${m.id}`);
    } catch (e) {
      console.error('openModuleDashboard failed', e);
      router.push(`/module/${m.id}`);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Loading coins…</div>;
  }

  const familyOrder = Array.from(new Set(modules.map(m => (m.module_families && m.module_families.length > 0) ? m.module_families[0].name : 'Uncategorized')));
  const modulesByFamily: Record<string, ModuleRecord[]> = {};
  for (const name of familyOrder) modulesByFamily[name] = [];
  for (const mod of modules) {
    const familyName = (mod.module_families && mod.module_families.length > 0) ? mod.module_families[0].name : 'Uncategorized';
    modulesByFamily[familyName].push(mod);
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl tracking-widest font-bold mt-2">CHALLENGE COINS</h1>
        </div>

        <div className="bg-[#0b0f14] border border-[#202933] rounded-3xl p-8 shadow-inner">
          {fetchError ? (
            <div className="text-rose-400 mb-4">Warning: failed to load modules: {fetchError}</div>
          ) : null}

          {familyOrder.map((familyName) => {
            const familyModules = modulesByFamily[familyName] ?? [];
            if (!familyModules.length) return null;

            return (
              <section key={familyName} className="py-8">
                <div className="flex justify-center">
                  <div className="coin-grid">
                    {familyModules.map((m) => (
                      <div
                        key={m.id}
                        className="coin-tile"
                        role="button"
                        tabIndex={0}
                        onClick={() => openModuleDashboard(m)}
                        onKeyDown={(e) => { if (e.key === 'Enter') openModuleDashboard(m); }}
                        aria-label={`Open module ${m.name}`}
                      >
                        <div style={{ width: 84, height: 84 }} className="relative">
                          {m.image_path ? (
                            // fallback to placeholder on error
                            <img
                              src={m.image_path}
                              alt={m.name ?? ''}
                              className="tile-image"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/coins/placeholder.svg';
                              }}
                            />
                          ) : (
                            <img src="/coins/placeholder.svg" alt="" className="tile-image" />
                          )}
                        </div>

                        <div className="module-tile-title">{m.name}</div>

                        {m.description ? <div className="module-tile-desc">{m.description}</div> : <div className="module-tile-desc text-muted">No description</div>}

                        <div className="module-tile-meta">
                          <div className="module-badge">{m.module_code ?? '—'}</div>
                          <div className="module-badge">Scenario: {m.default_scenario_id ?? 'TBD'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <div className="inline-block px-4 py-1 bg-transparent text-sm font-semibold tracking-wider uppercase text-slate-200">
                    {familyName}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
