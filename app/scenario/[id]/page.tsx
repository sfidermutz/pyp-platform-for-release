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

  // local file path
  const repoRoot = process.cwd();
  const fileA = path.join(repoRoot, 'data', 'scenarios', `${id}.json`);
  const fileB = path.join(repoRoot, 'data', 'scenarios', `${id.toUpperCase()}.json`); // fallback capitalization
  let raw = '';

  try {
    // try fileA then fileB
    try {
      raw = await fs.readFile(fileA, 'utf8');
    } catch (errA) {
      try {
        raw = await fs.readFile(fileB, 'utf8');
      } catch (errB) {
        // fallback to raw GitHub fetch (best-effort)
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

    // Accept either scenario_id or scenarioId
    if (!content || !(content.scenario_id || content.scenarioId || content.id)) {
      console.error('Scenario JSON invalid or missing id', { id, keys: Object.keys(content || {}) });
      return (
        <div className="min-h-screen flex items-center justify-center text-white bg-black">
          Scenario not found.
        </div>
      );
    }

    // Normalize some fields so ScenarioEngine expects scenario.* (unchanged)
    // No mutation needed — ScenarioEngine will use content fields directly.

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
