// app/scenario/[id]/page.tsx
import React from 'react';
import ScenarioEngine from '@/components/ScenarioEngine';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Props = { params: { id: string } };

/**
 * Robust scenario loader:
 *  - look for exact filename in data/scenarios (case-sensitive)
 *  - look for case-insensitive filename
 *  - scan all files in data/scenarios and match internal scenario_id/scenarioId/id
 *  - try public/data/scenarios as fallback
 *  - try raw.githubusercontent.com direct file fetch
 *  - as a last resort, query GitHub API content listing and scan remote files for matching scenario id
 *
 * This combines filesystem and remote fallbacks so the demo works reliably on Vercel.
 */

async function readLocalFileIfExists(filePath: string) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (e) {
    return null;
  }
}

async function tryGithubRawFile(id: string) {
  try {
    const RAW_BASE = 'https://raw.githubusercontent.com/sfidermutz/pyp-platform-for-release/main';
    const rawUrl = `${RAW_BASE}/data/scenarios/${encodeURIComponent(id)}.json`;
    const res = await fetch(rawUrl);
    if (!res.ok) {
      console.warn('raw github fetch failed', rawUrl, res.status);
      return null;
    }
    const text = await res.text();
    return { raw: text, source: rawUrl };
  } catch (e) {
    console.warn('raw github fetch error', e);
    return null;
  }
}

// As last resort, query GitHub API to list files and scan remote scenario files for matching id
async function tryGithubScanForScenario(id: string) {
  try {
    // GitHub API listing (public repo)
    const apiUrl = 'https://api.github.com/repos/sfidermutz/pyp-platform-for-release/contents/data/scenarios';
    const res = await fetch(apiUrl);
    if (!res.ok) {
      console.warn('github api listing failed', apiUrl, res.status);
      return null;
    }
    const listing = await res.json();
    if (!Array.isArray(listing)) return null;

    for (const item of listing) {
      if (!item || !item.name || !item.download_url) continue;
      if (!item.name.toLowerCase().endsWith('.json')) continue;
      try {
        const r = await fetch(item.download_url);
        if (!r.ok) continue;
        const raw = await r.text();
        try {
          const parsed = JSON.parse(raw);
          const sid = parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null;
          if (sid && String(sid).toLowerCase() === id.toLowerCase()) {
            return { raw, source: item.download_url };
          }
        } catch (pe) {
          // ignore parse errors for this remote file and continue
          continue;
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  } catch (e) {
    console.warn('github scan error', e);
    return null;
  }
}

async function findScenarioById(id: string) {
  const repoRoot = process.cwd();
  const scenarioDirs = [
    path.join(repoRoot, 'data', 'scenarios'),
    path.join(repoRoot, 'public', 'data', 'scenarios')
  ];

  // Try local directories first
  for (const scenariosDir of scenarioDirs) {
    try {
      const files = await fs.readdir(scenariosDir);
      // exact filename
      const exact = files.find(f => f === `${id}.json`);
      if (exact) {
        const raw = await readLocalFileIfExists(path.join(scenariosDir, exact));
        if (raw) return { raw, source: path.join(scenariosDir, exact) };
      }
      // case-insensitive filename
      const caseInsensitive = files.find(f => f.toLowerCase() === `${id.toLowerCase()}.json`);
      if (caseInsensitive) {
        const raw = await readLocalFileIfExists(path.join(scenariosDir, caseInsensitive));
        if (raw) return { raw, source: path.join(scenariosDir, caseInsensitive) };
      }

      // If not by filename, scan files for internal scenario id
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        try {
          const raw = await readLocalFileIfExists(path.join(scenariosDir, f));
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const sid = parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null;
          if (sid && String(sid).toLowerCase() === id.toLowerCase()) {
            return { raw, source: path.join(scenariosDir, f) };
          }
        } catch (pErr) {
          // continue scanning other files
          console.warn('local scenario parse error', scenariosDir, f, String(pErr));
          continue;
        }
      }
    } catch (e) {
      // directory missing — continue to next
      console.warn('skipping scenarios dir', scenariosDir, String(e));
    }
  }

  // Try direct raw file on GitHub
  const rawAttempt = await tryGithubRawFile(id);
  if (rawAttempt) return rawAttempt;

  // Last resort: scan GitHub listing for matching internal scenario_id
  const scanAttempt = await tryGithubScanForScenario(id);
  if (scanAttempt) return scanAttempt;

  return null;
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
      console.error('Scenario not found after all fallbacks', { id });
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
