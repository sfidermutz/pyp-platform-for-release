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
};

export default function CoinsPage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  async function fetchModules() {
    setLoading(true);
    const { data, error } = await supabase
      .from('modules')
      .select(`id, name, description, shelf_position, is_demo, image_path, default_scenario_id, module_families ( name, code )`)
      .eq('is_demo', true)
      .order('shelf_position', { ascending: true });

    setLoading(false);
    if (error) {
      console.error('fetch modules error', error);
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
        default_scenario_id: m.default_scenario_id ?? null
      };
    });

    setModules(normalized);
  }

  async function startModuleImmediately(m: ModuleRecord) {
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
        body: JSON.stringify({ session_id: sessionId, event_type: 'enter_module', payload: { module_id: m.id }})
      }).catch(()=>{});

      if (m.default_scenario_id) {
        router.push(`/scenario/${encodeURIComponent(m.default_scenario_id)}`);
      } else {
        router.push(`/module/${m.id}`);
      }
    } catch (e) {
      console.error('startModuleImmediately failed', e);
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
          <p className="text-xs text-slate-500">PYP: STRATEGIC EDGE · TRL-4 PILOT</p>
          <h1 className="text-4xl tracking-widest font-bold mt-2">CHALLENGE COINS</h1>
        </div>

        <div className="bg-[#0b0f14] border border-[#202933] rounded-3xl p-8 shadow-inner space-y-12">
          {familyOrder.map((familyName) => {
            const familyModules = modulesByFamily[familyName] ?? [];
            if (!familyModules.length) return null;

            return (
              <div key={familyName} className="py-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-6 items-end justify-items-center">
                  {familyModules.map((m) => (
                    <div key={m.id} className="text-center">
                      <button
                        onClick={() => startModuleImmediately(m)}
                        className="w-36 h-36 rounded-full mx-auto border-2 border-slate-700 flex items-center justify-center bg-gradient-to-b from-[#0f1720] to-transparent overflow-hidden relative shadow-sm transform-none"
                        aria-label={m.name}
                        title={m.name}
                      >
                        {m.image_path ? (
                          <img
                            src={m.image_path}
                            alt=""
                            role="presentation"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/coins/placeholder.svg'; }}
                          />
                        ) : (
                          <img src="/coins/placeholder.svg" alt="" role="presentation" className="w-full h-full object-cover" />
                        )}

                        <span className="absolute bottom-1 right-2 text-[10px] text-white/80 font-semibold">
                          {m.shelf_position ?? ''}
                        </span>
                      </button>

                      <div className="mt-2 text-sm font-semibold">{m.name}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <div className="inline-block px-4 py-1 bg-transparent text-sm font-semibold tracking-wider uppercase text-slate-200">
                    {familyName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
