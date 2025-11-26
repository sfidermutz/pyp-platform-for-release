cat > app/coins/page.tsx <<'EOF'
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type ModuleFamilyItem = { name: string; code: string };
type ModuleFamily = ModuleFamilyItem[];

type ModuleRecord = {
  id: string;
  name: string;
  description: string | null;
  shelf_position: number | null;
  is_demo: boolean;
  module_families: ModuleFamily;
  image_path?: string | null;
};

export default function CoinsPage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ModuleRecord | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pyp_token') : null;
    if (!token) {
      router.push('/');
      return;
    }

    fetchModules();
    // log page view if session exists
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
      .select(`id, name, description, shelf_position, is_demo, image_path, module_families ( name, code )`)
      .eq('is_demo', true)
      .order('shelf_position', { ascending: true });

    setLoading(false);
    if (error) {
      console.error('fetch modules error', error);
      return;
    }

    // Normalize module_families into an array of {name, code} and ensure image_path is present
    const normalized: ModuleRecord[] = (data ?? []).map((m: any) => {
      const fam = m.module_families;
      let families: ModuleFamily = [];

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
      };
    });

    setModules(normalized);
  }

  async function logEvent(evt: { event_type: string; payload?: any }) {
    try {
      const session_id = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;
      if (!session_id) return;
      await fetch('/api/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id,
          event_type: evt.event_type,
          payload: evt.payload || {}
        })
      });
    } catch (e) {
      console.debug('logEvent failed', e);
    }
  }

  function onSelectModule(m: ModuleRecord) {
    setSelected(m);
    logEvent({ event_type: 'module_select', payload: { module_id: m.id, module_name: m.name }});
  }

  async function onEnterModule() {
    if (!selected) return;
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;
    if (sessionId) {
      await logEvent({ event_type: 'enter_module', payload: { module_id: selected.id }});
    } else {
      console.warn('No session id found when entering module');
    }
    router.push(`/module/${selected.id}`);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Loading coins…</div>;
  }

  // Group modules by family (use the first family if present)
  const familyOrder = Array.from(new Set(modules.map(m => (m.module_families && m.module_families.length > 0) ? m.module_families[0].name : 'Uncategorized')));
  const modulesByFamily: Record<string, ModuleRecord[]> = {};
  for (const name of familyOrder) modulesByFamily[name] = [];
  for (const mod of modules) {
    const familyName = (mod.module_families && mod.module_families.length > 0) ? mod.module_families[0].name : 'Uncategorized';
    if (!modulesByFamily[familyName]) modulesByFamily[familyName] = [];
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
            // If a family ended up with zero modules, skip it
            if (!familyModules.length) return null;

            return (
              <div key={familyName} className="py-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 items-end justify-items-center">
                  {familyModules.map((m) => {
                    const ready = true;
                    return (
                      <div key={m.id} className="text-center">
                        <button
                          onClick={() => (ready ? onSelectModule(m) : undefined)}
                          className={`w-44 h-44 rounded-full mx-auto border-2 ${selected?.id === m.id ? 'ring-4 ring-sky-500' : 'border-slate-700'} flex items-center justify-center bg-gradient-to-b from-[#0f1720] to-transparent overflow-hidden relative`}
                          aria-label={m.name}
                        >
                          {m.image_path ? (
                            <img
                              src={m.image_path}
                              alt={m.name}
                              className="w-full h-full object-cover"
                              style={{ objectPosition: 'center' }}
                            />
                          ) : (
                            <span className="text-xl font-semibold">{m.shelf_position ?? '?'}</span>
                          )}

                          {/* small shelf-position label */}
                          <span className="absolute bottom-1 right-2 text-[10px] text-white/80 font-semibold">
                            {m.shelf_position ?? ''}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Family label centered under the group's coins */}
                <div className="mt-6 text-center">
                  <div className="inline-block px-4 py-1 bg-transparent text-sm font-semibold tracking-wider uppercase text-slate-200">
                    {familyName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black/70" onClick={() => setSelected(null)} />
            <div className="relative bg-[#0b0f12] rounded-xl border border-slate-800 p-6 max-w-xl w-full z-10">
              <h2 className="text-xl font-bold">{selected.name}</h2>
              <p className="mt-3 text-sm text-slate-300">{selected.description}</p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setSelected(null)} className="px-4 py-2 rounded bg-slate-700">Close</button>
                <button onClick={onEnterModule} className="px-4 py-2 rounded bg-sky-500 text-black font-bold">Enter Module</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
EOF
