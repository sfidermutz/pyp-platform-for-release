// pages/api/module-scenarios.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

async function tryGithubScanForModule(moduleId: string) {
  try {
    const apiUrl = 'https://api.github.com/repos/sfidermutz/pyp-platform-for-release/contents/data/scenarios';
    console.log('[api] github listing url', apiUrl);
    const res = await fetch(apiUrl);
    if (!res.ok) return [];
    const listing = await res.json();
    if (!Array.isArray(listing)) return [];

    const matches: any[] = [];
    for (const item of listing) {
      if (!item || !item.name || !item.download_url) continue;
      if (!item.name.toLowerCase().endsWith('.json')) continue;
      try {
        const r = await fetch(item.download_url);
        if (!r.ok) {
          console.warn('[api] remote file fetch failed', item.download_url, r.status);
          continue;
        }
        const raw = await r.text();
        const parsed = JSON.parse(raw);
        const mid = parsed?.moduleId ?? parsed?.module_id ?? parsed?.module ?? parsed?.moduleCode ?? parsed?.moduleCode;
        if (mid && String(mid).toLowerCase() === String(moduleId).toLowerCase()) {
          matches.push({
            filename: item.name,
            scenario_id: parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null,
            title: parsed?.title ?? parsed?.name ?? '',
            role: parsed?.role ?? '',
            learningOutcome: parsed?.learningOutcome ?? parsed?.scenario_LO ?? parsed?.scenarioLO ?? '',
            narrative: parsed?.narrative ?? parsed?.situation ?? ''
          });
        }
      } catch (e) {
        console.warn('[api] remote parse exception', item.name, String(e));
        continue;
      }
    }
    return matches;
  } catch (e) {
    console.warn('[api] tryGithubScanForModule error', String(e));
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const moduleQ = (req.query.module as string) || (req.query.moduleId as string) || (req.query.module_id as string);
    if (!moduleQ) return res.status(400).json({ error: 'missing module query parameter' });
    const moduleId = moduleQ;

    const repoRoot = process.cwd();
    const scenariosDir = path.join(repoRoot, 'data', 'scenarios');

    let files: string[] = [];
    try {
      files = await fs.readdir(scenariosDir);
    } catch (err) {
      console.warn('[api] scenarios dir not found locally, will attempt remote scan', String(err));
      const remoteMatches = await tryGithubScanForModule(moduleId);
      return res.status(200).json({ scenarios: remoteMatches });
    }

    const results: any[] = [];
    for (const f of files) {
      if (!f.toLowerCase().endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(scenariosDir, f), 'utf8');
        const parsed = JSON.parse(raw);
        const mid = parsed?.moduleId ?? parsed?.module_id ?? parsed?.module ?? parsed?.moduleCode ?? parsed?.moduleCode;
        if (mid && String(mid).toLowerCase() === String(moduleId).toLowerCase()) {
          results.push({
            filename: f,
            scenario_id: parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null,
            title: parsed?.title ?? parsed?.name ?? '',
            role: parsed?.role ?? '',
            learningOutcome: parsed?.learningOutcome ?? parsed?.scenario_LO ?? parsed?.scenarioLO ?? '',
            narrative: parsed?.narrative ?? parsed?.situation ?? ''
          });
        }
      } catch (e) {
        console.warn('[api] skipping scenario file due to parse error', f, String(e));
        continue;
      }
    }

    if (results.length === 0) {
      const remoteMatches = await tryGithubScanForModule(moduleId);
      return res.status(200).json({ scenarios: remoteMatches });
    }

    results.sort((a, b) => {
      const ai = (a.scenario_id || '').toString();
      const bi = (b.scenario_id || '').toString();
      if (!ai && !bi) return 0;
      if (!ai) return 1;
      if (!bi) return -1;
      return ai.localeCompare(bi);
    });

    return res.status(200).json({ scenarios: results });
  } catch (e) {
    console.error('[api] module-scenarios error', String(e));
    return res.status(500).json({ error: 'server error' });
  }
}
