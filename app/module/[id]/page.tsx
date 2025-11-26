// app/module/[id]/page.tsx  — server component
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import ModuleClient from '@/components/ModuleClient'; // small client wrapper (see note)

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
      return <div className="min-h-screen flex items-center justify-center text-white bg-black">Module not found.</div>;
    }

    // ModuleClient is a small client component that handles "Start Scenario" UI.
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">{data.name}</h1>
          <p className="mt-4 text-slate-300">{data.description}</p>
          <div className="mt-6">
            {/* Pass module as prop to client component */}
            {/* ModuleClient would contain the Start Scenario button and client interactions */}
            <ModuleClient module={data} />
          </div>
        </div>
      </main>
    );
  } catch (err) {
    console.error(err);
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Module not found.</div>;
  }
}
