'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type ModuleFamily = { name: string; code: string } | null;

type ModuleRecord = {
  id: string;
  name: string;
  description: string | null;
  shelf_position: number | null;
  is_demo: boolean;
  module_families?: ModuleFamily;
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
    // log page view
    const sessionId = localStorage.getItem('pyp_session_id');
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
    // fetch modules including the family relation (Supabase returns relation as an array)
    const { data, error } = await supabase
      .from('modules')
      .select(`id, name, description, shelf_position, is_demo, module_families ( name, code )`)
      .eq('is_demo', true)
      .order('shelf_position', { ascending: true });

    setLoading(false);
    if (error) {
      console.error('fetch modules error', error);
      return;
    }

    // NORMALIZE: Supabase returns module_families as an array; convert it to a single object or null
    const normalized: ModuleRecord[] = (data ?? []).map((m: any) => {
      const fam = m.module_families;
      let familyObj: ModuleFamily = null;
      if (Array.isArray(fam)) {
        familyObj = fam.length > 0 ? { name: fam[0].name, code: fam[0].code } : null;
      } else if (fam && typeof fam === 'object') {
        familyObj = { name: fam.name, code: fam.code };
      }
      return {
        id: m.id,
        name: m.name,
        description: m.description ?? null,
        shelf_position: m.shelf_position ?? null,
        is_demo: m.is_demo ?? false,
        module_families: familyObj,
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
    const sessionId = localStorage.getItem('pyp_session_id');
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

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs text-slate-500">PYP: STRATEGIC EDGE · TRL-4 PILOT</p>
          <h1 className="text-4xl tracking-widest font-bold mt-2">CHALLENGE COINS</h1>
        </div>

        <div className="bg-[#0b0f14] border border-[#202933] rounded-3xl p-8 shadow-inner">
          <div className="grid grid-cols-6 gap-8">
            {modules.map((m) => {
              const ready = true; // keep simple for demo
              return (
                <div key={m.id} className="text-center">
                  <button
                    onClick={() => ready && onSelectModule(m)}
                    className={`w-36 h-36 rounded-full mx-auto border-2 ${selected?.id === m.id ? 'ring-4 ring-sky-500' : 'border-slate-700'} flex items-center justify-center bg-gradient-to-b from-[#0f1720] to-transparent`}
                  >
                    <span className="text-xl font-semibold">{m.shelf_position ?? '?'}</span>
                  </button>
                  <div className="mt-3 text-xs font-semibold tracking-wider">{m.name}</div>
                  <div className={`mt-1 text-xs ${ready ? 'text-emerald-400' : 'text-slate-600'}`}>{ready ? 'READY' : 'LOCKED'}</div>
                </div>
              );
            })}
          </div>
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
