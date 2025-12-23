// pages/api/admin/validate_scenario.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { buildAjvValidator, validateScenarioPayload, fixScenarioPayload } from '@/lib/validateScenario';
import { checkAdminApiKey } from '@/lib/adminAuth';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Admin auth
    const headerBag = new Headers(req.headers as Record<string, string>);
    const authOk = checkAdminApiKey ? checkAdminApiKey(headerBag) : (req.headers['x-api-key'] === process.env.ADMIN_API_KEY);
    if (typeof authOk === 'object') {
      // library may return {ok, status, message}
      if (!authOk.ok) return res.status(authOk.status ?? 403).json({ error: authOk.message ?? 'unauthorized' });
    } else if (!authOk) {
      return res.status(403).json({ error: 'unauthorized' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method not allowed' });
    }

    let payload: any;
    try { payload = req.body; } catch (e) { return res.status(400).json({ error: 'invalid json body' }); }

    // Ensure schema load
    buildAjvValidator();

    // Validate
    const result = validateScenarioPayload(payload);
    let response: any = { valid: result.valid, errors: result.ajvErrors.concat(result.errors), warnings: result.warnings };

    // If ?fix=true, attempt mechanical fixes
    const fix = String(req.query.fix || '').toLowerCase() === 'true';
    if (!result.valid && fix) {
      const { fixedPayload, changelogNotes } = fixScenarioPayload(payload);
      // Write changelog entry
      const changelogPath = path.join(process.cwd(), 'data', 'CHANGELOG.md');
      const entry = `---
# ${new Date().toISOString()}
migrated_by: admin-validate-scenario
notes:
${changelogNotes.map(n => `- ${n}`).join('\n')}

`;
      try {
        if (!fs.existsSync(path.dirname(changelogPath))) {
          fs.mkdirSync(path.dirname(changelogPath), { recursive: true });
        }
        fs.appendFileSync(changelogPath, entry, 'utf8');
      } catch (e) {
        console.warn('Failed to write CHANGELOG', String(e));
      }

      // Return fixed payload in response, but do not overwrite original file
      response.fixed = fixedPayload;
      response.changelogNotes = changelogNotes;
      // Re-validate fixed payload
      const revalidate = validateScenarioPayload(fixedPayload);
      response.revalidated = { valid: revalidate.valid, errors: revalidate.ajvErrors.concat(revalidate.errors), warnings: revalidate.warnings };
    }

    return res.status(200).json(response);
  } catch (e) {
    console.error('admin validate error', e);
    return res.status(500).json({ error: 'server error' });
  }
}
