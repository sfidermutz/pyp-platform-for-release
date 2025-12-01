// app/module/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ModuleClient from '@/components/ModuleClient';
import { supabase } from '@/lib/supabaseClient';

export default function ModulePageClient() {
  const params = useParams();
  const id = (params as any)?.id as string | undefined;

  const [mod, setMod] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('missing id');
      setMod(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // NOTE: do not request `ects` column (some DBs don't have it).
        const { data, error } = await supabase
          .from('modules')
          .select('id, name, description, module_code, image_path, default_scenario_id, module_families ( name )')
          .eq('id', id)
          .maybeSingle();

        if (!active) return;

        if (error) {
          console.error('Module fetch error (client):', error);
          setError(error.message || 'db error');
          setMod(null);
        } else {
          setMod(data);
        }
      } catch (e) {
        console.error('Module fetch client exception:', e);
        setError(String(e));
        setMod(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  if (!id) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Module not found.</div>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Loading module…</div>;
  }

  if (error || !mod) {
    console.debug('Module page client error', error);
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Module not found.</div>;
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <ModuleClient module={mod} />
      </div>
    </main>
  );
}
