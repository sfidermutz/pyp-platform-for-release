// pages/api/scenarios/[moduleKey].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

async function localModuleScan(moduleId: string) {
  const results: any[] = [];
  const repoRoot = process.cwd();
  const scenariosDir = path.join(repoRoot, 'data', 'scenarios');
  try {
    const files = await fs.readdir(scenariosDir);
    for (const f of files) {
      if (!f.toLowerCase().endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(scenariosDir, f), 'utf8');
        const parsed = JSON.parse(raw);
        const mid = parsed?.moduleId ?? parsed?.module_id ?? parsed?.module ?? parsed?.moduleCode;
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
        // ignore individual parse errors
      }
    }
  } catch (e) {
    // directory missing
  }
  return results;
}

async function tryGithubScanForModule(moduleId: string) {
  try {
    const apiUrl = 'https://api.github.com/repos/sfidermutz/pyp-platform-for-release/contents/data/scenarios';
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
        if (!r.ok) continue;
        const raw = await r.text();
        const parsed = JSON.parse(raw);
        const mid = parsed?.moduleId ?? parsed?.module_id ?? parsed?.module ?? parsed?.moduleCode;
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
      } catch (e) { /* ignore */ }
    }
    return matches;
  } catch (e) {
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const { moduleKey } = req.query;
    const moduleId = Array.isArray(moduleKey) ? moduleKey[0] : (moduleKey ?? '');
    if (!moduleId) return res.status(400).json({ error: 'moduleKey required' });

    let results = await localModuleScan(moduleId);
    if (!results || results.length === 0) {
      results = await tryGithubScanForModule(moduleId);
    }

    return res.status(200).json({ module_title: moduleId, scenarios: results });
  } catch (e) {
    console.error('scenarios module api error', e);
    return res.status(500).json({ error: 'server error' });
  }
}
