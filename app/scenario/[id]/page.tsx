// app/scenario/[id]/page.tsx
import React from 'react';
import ScenarioEngine from '@/components/ScenarioEngine';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Props = { params: { id: string } };

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
    // Read scenario from local repo filesystem at /data/scenarios/{id}.json
    const repoRoot = process.cwd();
    const filePath = path.join(repoRoot, 'data', 'scenarios', `${id}.json`);

    let raw = '';
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (fsErr) {
      // Not found locally — fallback to raw GitHub (keeps earlier behavior if needed)
      try {
        const RAW_BASE = 'https://raw.githubusercontent.com/sfidermutz/pyp-platform-for-release/main';
        const rawUrl = `${RAW_BASE}/data/scenarios/${encodeURIComponent(id)}.json`;
        const res = await fetch(rawUrl);
        if (res.ok) raw = await res.text();
        else {
          console.error('Scenario not found locally and remote fetch failed', { id, status: res.status });
          return (
            <div className="min-h-screen flex items-center justify-center text-white bg-black">
              Scenario not found.
            </div>
          );
        }
      } catch (e) {
        console.error('Scenario fetch fallback failed', e);
        return (
          <div className="min-h-screen flex items-center justify-center text-white bg-black">
            Scenario not found.
          </div>
        );
      }
    }

    let content: any = null;
    try {
      content = JSON.parse(raw);
    } catch (parseErr) {
      console.error('Scenario JSON parse error', { id, parseErr: String(parseErr) });
      return (
        <div className="min-h-screen flex items-center justify-center text-white bg-black">
          Scenario not found.
        </div>
      );
    }

    if (!content || !content.scenario_id) {
      console.error('Scenario JSON invalid', { id });
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
    console.error('Error preparing scenario', err);
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Scenario not found.
      </div>
    );
  }
}
