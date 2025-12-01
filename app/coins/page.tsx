// app/coins/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ModuleCard from '@/components/ModuleCard';

type Family = { name: string; code?: string };
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
};

export default function CoinsPage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [activeFamily, setActiveFamily] = useState<string>('All');

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
        .select(`id, name, description, shelf_position, is_demo, image_path, default_scenario_id, module_families ( name, code ), module_code, ects`)
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
    // create session and navigate (preserve existing behavior)
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

  // family list (All + families)
  const familyOrder = useMemo(() => {
    const families = Array.from(new Set(modules.flatMap(m => (m.module_families && m.module_families.length > 0) ? m.module_families.map(f => f.name) : ['Uncategorized'])));
    return ['All', ...families.filter(Boolean)];
  }, [modules]);

  // filter modules by active family & search
  const filteredModules = useMemo(() => {
    const q = (search ?? '').trim().toLowerCase();
    return modules.filter(m => {
      if (activeFamily && activeFamily !== 'All') {
        const fams = m.module_families?.map(f => (f.name ?? '').toLowerCase()) ?? [];
        if (!fams.includes(activeFamily.toLowerCase())) return false;
      }
      if (!q) return true;
      return (m.name ?? '').toLowerCase().includes(q) || (m.description ?? '').toLowerCase().includes(q) || (m.module_code ?? '').toLowerCase().includes(q);
    });
  }, [modules, activeFamily, search]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Loading coins…</div>;
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl tracking-widest font-bold mt-2">CHALLENGE COINS</h1>
        </div>

        <div className="bg-[#0b0f14] border border-[#202933] rounded-3xl p-6 shadow-inner">
          {fetchError ? (
            <div className="text-rose-400 mb-4">Warning: failed to load modules: {fetchError}</div>
          ) : null}

          {/* Controls: search + family tabs */}
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
                  value={activeFamily}
                  onChange={(e) => setActiveFamily(e.target.value)}
                  className="rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                >
                  {familyOrder.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center text-xs text-slate-400">
                {filteredModules.length} modules
              </div>
              <button onClick={() => { setSearch(''); setActiveFamily('All'); }} className="px-3 py-2 rounded-md border border-slate-700 text-sm">Reset</button>
            </div>
          </div>

          {/* Family tabs for small screens */}
          <div className="md:hidden mb-4 overflow-auto">
            <div className="flex gap-2">
              {familyOrder.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFamily(f)}
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
