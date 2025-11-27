// app/api/module-scenarios/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const moduleQ = url.searchParams.get('module') || url.searchParams.get('moduleId') || url.searchParams.get('module_id');
    if (!moduleQ) {
      return NextResponse.json({ error: 'missing module query parameter' }, { status: 400 });
    }
    const moduleId = moduleQ;

    const repoRoot = process.cwd();
    const scenariosDir = path.join(repoRoot, 'data', 'scenarios');

    let files: string[] = [];
    try {
      files = await fs.readdir(scenariosDir);
    } catch (err) {
      // if folder missing, return empty
      console.error('scenarios dir not found', err);
      return NextResponse.json({ scenarios: [] });
    }

    const results: any[] = [];

    for (const f of files) {
      if (!f.toLowerCase().endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(scenariosDir, f), 'utf8');
        const parsed = JSON.parse(raw);
        // accommodate multiple naming styles for module id
        const mid = parsed?.moduleId ?? parsed?.module_id ?? parsed?.module ?? parsed?.moduleCode ?? parsed?.moduleCode;
        // Accept matching module ids case-insensitive or if parsed has "moduleId":"HYB" etc.
        if (mid && String(mid).toLowerCase() === String(moduleId).toLowerCase()) {
          results.push({
            filename: f,
            scenario_id: parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null,
            title: parsed?.title ?? parsed?.name ?? '',
            role: parsed?.role ?? '',
            learningOutcome: parsed?.learningOutcome ?? parsed?.scenario_LO ?? parsed?.scenarioLO ?? '',
            narrative: parsed?.narrative ?? parsed?.situation ?? '',
            reflections: parsed?.reflections ?? parsed?.reflection1_prompt ? {
              pre: parsed?.reflections?.pre ?? parsed?.reflections?.pre ?? (parsed?.reflection1_prompt ? { prompt: parsed?.reflection1_prompt } : null),
              post: parsed?.reflections?.post ?? parsed?.reflection2_prompt ? { prompt: parsed?.reflection2_prompt } : null
            } : null
          });
        }
      } catch (e) {
        console.warn('skipping scenario file due to parse error', f, String(e));
        continue;
      }
    }

    // sort by scenario_id or filename to produce consistent ordering
    results.sort((a, b) => {
      const ai = (a.scenario_id || '').toString();
      const bi = (b.scenario_id || '').toString();
      if (!ai && !bi) return 0;
      if (!ai) return 1;
      if (!bi) return -1;
      return ai.localeCompare(bi);
    });

    return NextResponse.json({ scenarios: results });
  } catch (e) {
    console.error('module-scenarios error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
