// app/api/module-scenarios/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

async function tryGithubScanForModule(moduleId: string) {
  try {
    const apiUrl = 'https://api.github.com/repos/sfidermutz/pyp-platform-for-release/contents/data/scenarios';
    console.log('[api] github listing url', apiUrl);
    const res = await fetch(apiUrl);
    console.log('[api] github listing status', res.status);
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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const moduleQ = url.searchParams.get('module') || url.searchParams.get('moduleId') || url.searchParams.get('module_id');
    if (!moduleQ) {
      return NextResponse.json({ error: 'missing module query parameter' }, { status: 400 });
    }
    const moduleId = moduleQ;
    console.log('[api] module-scenarios requested module=', moduleId);

    const repoRoot = process.cwd();
    const scenariosDir = path.join(repoRoot, 'data', 'scenarios');

    let files: string[] = [];
    try {
      files = await fs.readdir(scenariosDir);
    } catch (err) {
      console.warn('[api] scenarios dir not found locally, will attempt remote scan', String(err));
      // remote fallback
      const remoteMatches = await tryGithubScanForModule(moduleId);
      console.log('[api] remoteMatches count', remoteMatches.length);
      return NextResponse.json({ scenarios: remoteMatches });
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

    // If no local matches, fallback to remote scan
    if (results.length === 0) {
      console.log('[api] no local results, trying remote scan');
      const remoteMatches = await tryGithubScanForModule(moduleId);
      console.log('[api] remoteMatches count', remoteMatches.length);
      return NextResponse.json({ scenarios: remoteMatches });
    }

    results.sort((a, b) => {
      const ai = (a.scenario_id || '').toString();
      const bi = (b.scenario_id || '').toString();
      if (!ai && !bi) return 0;
      if (!ai) return 1;
      if (!bi) return -1;
      return ai.localeCompare(bi);
    });

    console.log('[api] returning local results count', results.length);
    return NextResponse.json({ scenarios: results });
  } catch (e) {
    console.error('[api] module-scenarios error', String(e));
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
