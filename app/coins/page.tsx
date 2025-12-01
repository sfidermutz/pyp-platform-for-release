// app/coins/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ModuleCard from '@/components/ModuleCard';

type Family = { name?: string; code?: string };
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
  ects?: number | null;
  [key: string]: any;
};

export default function CoinsPage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [activeFamily, setActiveFamily] = useState<string>('All');

  // density: 'default' | 'dense'
  const [density, setDensity] = useState<'default' | 'dense'>('default');

  useEffect(() => {
    // restore density from localStorage
    try {
      const stored = localStorage.getItem('pyp_tile_density');
      if (stored === 'dense' || stored === 'default') setDensity(stored);
    } catch (e) {}
  }, []);

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
          module_code: m.module_code ?? null,
          ects: (typeof m.ects === 'number') ? m.ects : null
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

  function openModuleDashboard(m: ModuleRecord) {
    (async () => {
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
    })();
  }

  const familyOrder = useMemo(() => {
    const families = Array.from(new Set(modules.flatMap(m => (m.module_families && m.module_families.length > 0) ? m.module_families.map(f => f.name) : ['Uncategorized'])));
    return ['All', ...families.filter(Boolean)];
  }, [modules]);

  const filteredModules = useMemo(() => {
    const q = (search ?? '').trim().toLowerCase();
    return modules.filter(m => {
      if (activeFamily && activeFamily !== 'All') {
        const fams = m.module_families?.map(f => (f.name ?? '').toLowerCase()) ?? [];
        if (!fams.includes(activeFamily.toLowerCase())) return false;
      }
      if (!q) return true;
      const desc = (m.description ?? '') as string;
      const code = (m.module_code ?? '') as string;
      return (m.name ?? '').toLowerCase().includes(q) || desc.toLowerCase().includes(q) || code.toLowerCase().includes(q);
    });
  }, [modules, activeFamily, search]);

  // density toggle handler
  function toggleDensity() {
    const next = density === 'default' ? 'dense' : 'default';
    setDensity(next);
    try { localStorage.setItem('pyp_tile_density', next); } catch (e) {}
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Loading coins…</div>;
  }

  return (
    <main
      className="min-h-screen bg-black text-white px-6 py-12"
      // apply dynamic CSS var for tile height
      style={{ ['--coin-tile-height' as any]: density === 'dense' ? '300px' : '340px' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl tracking-widest font-bold mt-2">CHALLENGE COINS</h1>
        </div>

        <div className="bg-[#0b0f14] border border-[#202933] rounded-3xl p-6 shadow-inner">
          {fetchError ? (
            <div className="text-rose-400 mb-4">Warning: failed to load modules: {fetchError}</div>
          ) : null}

          {/* Controls: search + family + density */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <input
                type="search"
                placeholder="Search modules, code or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm w-64"
                aria-label="Search modules"
              />

              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                <span>Filter:</span>
                <select
                  id="family-filter"
                  aria-label="Filter by family"
                  value={activeFamily}
                  onChange={(e) => setActiveFamily(e.target.value)}
                  className="rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                >
                  {familyOrder.map((f) => <option key={String(f)} value={String(f)}>{String(f)}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center text-xs text-slate-400">
                {filteredModules.length} modules
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 mr-2">Density</label>
                <button
                  onClick={toggleDensity}
                  className={`px-3 py-1 rounded-md text-sm ${density === 'dense' ? 'bg-sky-500 text-black' : 'bg-transparent border border-slate-700 text-slate-200'}`}
                  aria-pressed={density === 'dense'}
                  aria-label="Toggle tile density"
                >
                  {density === 'dense' ? 'Dense' : 'Default'}
                </button>
              </div>

              <button onClick={() => { setSearch(''); setActiveFamily('All'); }} className="px-3 py-2 rounded-md border border-slate-700 text-sm">Reset</button>
            </div>
          </div>

          {/* Mobile family tabs */}
          <div className="md:hidden mb-4 overflow-auto">
            <div className="flex gap-2">
              {familyOrder.map(f => (
                <button
                  key={String(f)}
                  onClick={() => setActiveFamily(String(f))}
                  className={`px-3 py-1 rounded-full text-xs ${activeFamily === f ? 'bg-sky-500 text-black' : 'bg-transparent border border-slate-700 text-slate-200'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Modules grid */}
          <div className="coin-grid" role="list" aria-label="Modules">
            {filteredModules.map((m) => (
              <div role="listitem" key={m.id}>
                <ModuleCard module={m} onOpen={openModuleDashboard} />
              </div>
            ))}
          </div>

          {filteredModules.length === 0 && (
            <div className="mt-6 text-slate-400">No modules match your filters.</div>
          )}
        </div>
      </div>
    </main>
  );
}
