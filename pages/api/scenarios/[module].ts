import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { module } = req.query;
  if (!module || typeof module !== 'string') {
    res.status(400).json({ error: 'module required' });
    return;
  }

  const candidates = [
    path.join(process.cwd(), 'content', 'scenarios', `PYP_Hybrid_Module_Content_v1.0.json`),
    path.join(process.cwd(), 'content', 'scenarios', `${module}.json`),
    path.join(process.cwd(), 'content', 'scenarios', `${String(module).toUpperCase()}.json`)
  ];

  let found = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) { found = c; break; }
  }

  if (!found) {
    res.status(404).json({ error: 'module file not found' });
    return;
  }

  try {
    const raw = fs.readFileSync(found, 'utf8');
    const parsed = JSON.parse(raw);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json(parsed);
  } catch (err:any) {
    res.status(500).json({ error: err.message });
  }
}
