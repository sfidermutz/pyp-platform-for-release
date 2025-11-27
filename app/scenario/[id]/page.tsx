// app/scenario/[id]/page.tsx
import React from 'react';
import ScenarioEngine from '@/components/ScenarioEngine';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
type Props = { params: { id: string } };

// Diagnostic helpers
async function readLocalFileIfExists(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    console.log('[diag] readLocalFileIfExists ok', filePath, 'len=', raw.length);
    return raw;
  } catch (e) {
    console.warn('[diag] readLocalFileIfExists failed', filePath, String(e));
    return null;
  }
}

async function tryGithubRawFile(id: string) {
  try {
    const RAW_BASE = 'https://raw.githubusercontent.com/sfidermutz/pyp-platform-for-release/main';
    const rawUrl = `${RAW_BASE}/data/scenarios/${encodeURIComponent(id)}.json`;
    console.log('[diag] tryGithubRawFile fetching', rawUrl);
    const res = await fetch(rawUrl);
    console.log('[diag] tryGithubRawFile status', res.status, rawUrl);
    if (!res.ok) return null;
    const text = await res.text();
    console.log('[diag] tryGithubRawFile got length', text.length, rawUrl);
    return { raw: text, source: rawUrl };
  } catch (e) {
    console.warn('[diag] tryGithubRawFile error', String(e));
    return null;
  }
}

async function tryGithubScanForScenario(id: string) {
  try {
    const apiUrl = 'https://api.github.com/repos/sfidermutz/pyp-platform-for-release/contents/data/scenarios';
    console.log('[diag] tryGithubScanForScenario listing', apiUrl);
    const res = await fetch(apiUrl);
    console.log('[diag] github api listing status', res.status);
    if (!res.ok) {
      console.warn('[diag] github api listing failed', res.status);
      return null;
    }
    const listing = await res.json();
    if (!Array.isArray(listing)) {
      console.warn('[diag] github listing not array', typeof listing);
      return null;
    }
    console.log('[diag] github listing count', listing.length);

    for (const item of listing) {
      if (!item || !item.name || !item.download_url) continue;
      if (!item.name.toLowerCase().endsWith('.json')) continue;
      try {
        console.log('[diag] try remote file', item.name, item.download_url);
        const r = await fetch(item.download_url);
        console.log('[diag] remote file status', item.name, r.status);
        if (!r.ok) { console.warn('[diag] remote file fetch failed', r.status, item.download_url); continue; }
        const raw = await r.text();
        try {
          const parsed = JSON.parse(raw);
          const sid = parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null;
          if (sid && String(sid).toLowerCase() === id.toLowerCase()) {
            console.log('[diag] remote scenario matched', item.name, 'sid=', sid);
            return { raw, source: item.download_url };
          }
        } catch (pe) {
          console.warn('[diag] remote parse error', item.name, String(pe));
          continue;
        }
      } catch (e) {
        console.warn('[diag] remote fetch exception', item.name, String(e));
      }
    }
    return null;
  } catch (e) {
    console.warn('[diag] tryGithubScanForScenario error', String(e));
    return null;
  }
}

async function findScenarioById(id: string) {
  try {
    console.log('[diag] findScenarioById start', id);
    const repoRoot = process.cwd();
    console.log('[diag] process.cwd()', repoRoot);

    const scenarioDirs = [
      path.join(repoRoot, 'data', 'scenarios'),
      path.join(repoRoot, 'public', 'data', 'scenarios')
    ];

    for (const scenariosDir of scenarioDirs) {
      try {
        const stat = await fs.stat(scenariosDir);
        console.log('[diag] scenariosDir exists', scenariosDir, 'isDirectory=', stat.isDirectory());
      } catch (statErr) {
        console.warn('[diag] scenariosDir missing', scenariosDir, String(statErr));
        continue;
      }

      let files: string[] = [];
      try {
        files = await fs.readdir(scenariosDir);
        console.log('[diag] files in', scenariosDir, 'count=', files.length);
      } catch (e) {
        console.warn('[diag] readdir failed', scenariosDir, String(e));
        continue;
      }

      // exact filename
      const exact = files.find(f => f === `${id}.json`);
      if (exact) {
        const target = path.join(scenariosDir, exact);
        console.log('[diag] exact filename found', target);
        const raw = await readLocalFileIfExists(target);
        if (raw) return { raw, source: target };
      }

      const caseInsensitive = files.find(f => f.toLowerCase() === `${id.toLowerCase()}.json`);
      if (caseInsensitive) {
        const target = path.join(scenariosDir, caseInsensitive);
        console.log('[diag] case-insensitive filename found', target);
        const raw = await readLocalFileIfExists(target);
        if (raw) return { raw, source: target };
      }

      // scan internal ids
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        const target = path.join(scenariosDir, f);
        try {
          const raw = await readLocalFileIfExists(target);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            const sid = parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null;
            if (sid && String(sid).toLowerCase() === id.toLowerCase()) {
              console.log('[diag] matched by internal id in file', target, 'sid=', sid);
              return { raw, source: target };
            }
          } catch (pe) {
            console.warn('[diag] parse error for file', target, String(pe));
            continue;
          }
        } catch (e) {
          console.warn('[diag] read/parse exception', target, String(e));
        }
      }
    }

    // try raw file
    console.log('[diag] trying raw github file fallback');
    const rawAttempt = await tryGithubRawFile(id);
    if (rawAttempt) {
      console.log('[diag] raw github fallback success', rawAttempt.source);
      return rawAttempt;
    } else {
      console.log('[diag] raw github fallback not found');
    }

    // last resort: scan GitHub
    console.log('[diag] trying github scan fallback');
    const scanAttempt = await tryGithubScanForScenario(id);
    if (scanAttempt) {
      console.log('[diag] github scan fallback success', scanAttempt.source);
      return scanAttempt;
    }

    console.error('[diag] findScenarioById: NOT FOUND for id', id);
    return null;
  } catch (e) {
    console.error('[diag] findScenarioById failure', String(e));
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
    console.log('[diag] ScenarioPage invoked for id', id);
    const found = await findScenarioById(id);
    if (!found) {
      console.error('[diag] Scenario not found after all attempts', { id });
      return (
        <div className="min-h-screen flex items-center justify-center text-white bg-black">
          Scenario not found.
        </div>
      );
    }

    let content: any = null;
    try {
      content = JSON.parse(found.raw);
      console.log('[diag] Parsed scenario from', found.source, 'first200=', (found.raw || '').slice(0, 200).replace(/\n/g, ' '));
    } catch (e) {
      console.error('[diag] Failed to parse scenario JSON', { file: found.source, err: String(e) });
      return (
        <div className="min-h-screen flex items-center justify-center text-white bg-black">
          Scenario not found.
        </div>
      );
    }

    if (!content || !(content.scenario_id || content.scenarioId || content.id)) {
      console.error('[diag] Scenario JSON missing id', { file: found.source, keys: Object.keys(content || {}) });
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
    console.error('[diag] Error preparing scenario', err);
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Scenario not found.
      </div>
    );
  }
}
