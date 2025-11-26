// app/module/[id]/page.tsx
import React from 'react';
import ModuleClient from '@/components/ModuleClient';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type Props = { params: { id: string } };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function ModulePage({ params }: Props) {
  const id = params?.id;
  if (!id) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Module not found.</div>;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('modules')
      .select('*, module_families ( name )')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      console.error('Module fetch failed', { id, error });
      return <div className="min-h-screen flex items-center justify-center text-white bg-black">Module not found.</div>;
    }

    // ensure module structure ok
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">{data.name}</h1>
          <p className="mt-4 text-slate-300">{data.description}</p>
          <div className="mt-6">
            <ModuleClient module={data} />
          </div>
        </div>
      </main>
    );
  } catch (err) {
    // safe logging
    let errMsg = typeof err === 'object' ? JSON.stringify(err) : String(err);
    console.error('Module server error', { id, err: errMsg });
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Module not found.</div>;
  }
}
