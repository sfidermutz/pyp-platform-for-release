// app/scenario/[id]/page.tsx
import React from 'react';
import ScenarioEngine from '@/components/ScenarioEngine';

export const runtime = 'nodejs'; // explicit Node runtime (safe)

type Props = { params: { id: string } };

// Raw GitHub base for the repo's main branch
const RAW_BASE = 'https://raw.githubusercontent.com/sfidermutz/pyp-platform-for-release/main';

export default async function ScenarioPage({ params }: Props) {
  const id = params?.id;

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Scenario not found.
      </div>
    );
  }

  try {
    const rawUrl = `${RAW_BASE}/data/scenarios/${encodeURIComponent(id)}.json`;

    // fetch from raw GitHub URL on the server (avoids local fs issues)
    const res = await fetch(rawUrl, { method: 'GET' });

    // Diagnostic logging in runtime logs if anything odd happens
    if (!res.ok) {
      console.error('Scenario fetch failed', { id, url: rawUrl, status: res.status });
      return (
        <div className="min-h-screen flex items-center justify-center text-white bg-black">
          Scenario not found.
        </div>
      );
    }

    // parse JSON
    const content = await res.json();

    // Basic validation
    if (!content || !content.scenario_id) {
      console.error('Scenario JSON invalid', { id, url: rawUrl, preview: JSON.stringify(content).slice(0, 300) });
      return (
        <div className="min-h-screen flex items-center justify-center text-white bg-black">
          Scenario not found.
        </div>
      );
    }

    return (
      <main className="min-h-screen bg-black text-white px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <ScenarioEngine scenario={content} scenarioId={id} />
        </div>
      </main>
    );
  } catch (err) {
    // safe logging of unknown error types
    let errMsg: string;
    if (err && typeof err === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyErr: any = err;
      errMsg = anyErr?.stack ?? JSON.stringify(anyErr);
    } else {
      try {
        errMsg = JSON.stringify(err);
      } catch {
        errMsg = String(err);
      }
    }
    console.error('Error fetching/parsing scenario', { id, err: errMsg });
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Scenario not found.
      </div>
    );
  }
}
