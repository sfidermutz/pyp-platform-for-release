import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { scenarioKey } = req.query;
  if (!scenarioKey || typeof scenarioKey !== 'string') {
    res.status(400).json({ error: 'scenarioKey required' });
    return;
  }
  const possible = [
    path.join(process.cwd(), 'public', 'data', 'scenarios', `${scenarioKey}.json`),
    path.join(process.cwd(), 'content', 'scenarios', `${scenarioKey}.json`),
    path.join(process.cwd(), 'content', 'scenarios', `${String(scenarioKey).toUpperCase()}.json`),
  ];
  let found = null;
  for (const p of possible) if (fs.existsSync(p)) { found = p; break; }
  if (!found) {
    res.status(404).json({ error: 'scenario file not found' });
    return;
  }
  try {
    const raw = fs.readFileSync(found, 'utf8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json(JSON.parse(raw));
  } catch (err:any) {
    res.status(500).json({ error: err.message });
  }
}
