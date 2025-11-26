'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ModulePage({ params }: { params: { id: string }}) {
  const { id } = params;
  const [mod, setMod] = useState<any>(null);

  useEffect(() => {
    async function load() {
      // Guard: do not call Supabase if id is falsy (avoid id=undefined)
      if (!id) return;
      const { data } = await supabase
        .from('modules')
        .select('*, module_families(name)')
        .eq('id', id)
        .maybeSingle();
      setMod(data);
    }
    load();
  }, [id]);

  if (!mod) return <div className="min-h-screen flex items-center justify-center text-white bg-black">Loading module…</div>;

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold">{mod.name}</h1>
        <p className="mt-4 text-slate-300">{mod.description}</p>
        <div className="mt-6">
          <button className="px-4 py-2 bg-sky-500 rounded font-bold text-black">Start Scenario (placeholder)</button>
        </div>
      </div>
    </main>
  );
}
