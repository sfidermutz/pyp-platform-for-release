// app/module/[id]/page.tsx  — debug version (commit to main)
import React from 'react';
import ModuleClient from '@/components/ModuleClient';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
type Props = { params: { id: string } };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// create client only if keys exist so we can log safely
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

export default async function ModulePage({ params }: Props) {
  const id = params?.id;
  if (!id) {
    console.error('Module debug: missing id param');
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Module not found.</div>;
  }

  try {
    console.log('Module debug: id=', id, 'SUPABASE_URL present=', !!SUPABASE_URL, 'SERVICE_ROLE_KEY present=', !!SUPABASE_SERVICE_ROLE_KEY);

    if (!supabaseAdmin) {
      console.error('Module debug: supabase admin client not created (missing env vars)');
      return <div className="min-h-screen flex items-center justify-center text-white bg-black">Module not found.</div>;
    }

    const { data, error } = await supabaseAdmin
      .from('modules')
      .select('*, module_families ( name ), default_scenario_id')
      .eq('id', id)
      .maybeSingle();

    console.log('Module debug: fetch result', { id, dataPresent: !!data, error: error ? (error.message || error) : null, default_scenario_id: data?.default_scenario_id });

    if (error || !data) {
      console.error('Module fetch failed', { id, error });
      return <div className="min-h-screen flex items-center justify-center text-white bg-black">Module not found.</div>;
    }

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
    let errMsg = typeof err === 'object' ? JSON.stringify(err) : String(err);
    console.error('Module server error', { id, err: errMsg });
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Module not found.</div>;
  }
}
