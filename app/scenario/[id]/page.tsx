// app/scenario/[id]/page.tsx
import React from 'react';
import ScenarioEngine from '@/components/ScenarioEngine';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Props = { params: { id: string } };

async function findScenarioById(id: string) {
  const repoRoot = process.cwd();
  const scenariosDir = path.join(repoRoot, 'data', 'scenarios');

  try {
    const files = await fs.readdir(scenariosDir);
    // First try exact filename matches (case-sensitive and -insensitive)
    const exact = files.find(f => f === `${id}.json`);
    if (exact) {
      const raw = await fs.readFile(path.join(scenariosDir, exact), 'utf8');
      return { raw, source: exact };
    }
    const caseInsensitive = files.find(f => f.toLowerCase() === `${id.toLowerCase()}.json`);
    if (caseInsensitive) {
      const raw = await fs.readFile(path.join(scenariosDir, caseInsensitive), 'utf8');
      return { raw, source: caseInsensitive };
    }

    // If not found by filename, scan each scenario and look for scenario_id or scenarioId
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(scenariosDir, f), 'utf8');
        const parsed = JSON.parse(raw);
        const sid = parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null;
        if (sid && String(sid).toLowerCase() === id.toLowerCase()) {
          return { raw, source: f };
        }
      } catch (e) {
        // ignore parse errors for a single file and continue
        console.warn('skipping scenario file due to parse error', f, String(e));
      }
    }

    // Not found
    return null;
  } catch (e) {
    console.error('error reading scenarios dir', e);
    return null;
  }
}

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
    const found = await findScenarioById(id);
    if (!found) {
      console.error('Scenario not found', { id });
      return (
        <div className="min-h-screen flex items-center justify-center text-white bg-black">
          Scenario not found.
        </div>
      );
    }

    let content: any = null;
    try {
      content = JSON.parse(found.raw);
    } catch (e) {
      console.error('Failed to parse scenario JSON', { file: found.source, err: String(e) });
      return (
        <div className="min-h-screen flex items-center justify-center text-white bg-black">
          Scenario not found.
        </div>
      );
    }

    // Basic validation
    if (!content || !(content.scenario_id || content.scenarioId || content.id)) {
      console.error('Scenario JSON missing id', { file: found.source });
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
