// lib/adminAuth.ts
export function checkAdminApiKey(requestHeaders: Headers, adminKeyEnv?: string) {
  const ADMIN_API_KEY = adminKeyEnv ?? process.env.ADMIN_API_KEY;
  if (!ADMIN_API_KEY) {
    // no admin key configured — reject to avoid accidental public admin access
    return { ok: false, status: 403, message: 'ADMIN_API_KEY not configured on server' };
  }
  const header = requestHeaders.get('x-api-key') || requestHeaders.get('X-API-KEY') || requestHeaders.get('x-api-key'.toLowerCase());
  if (!header) {
    return { ok: false, status: 401, message: 'Missing x-api-key header' };
  }
  if (header !== ADMIN_API_KEY) {
    return { ok: false, status: 403, message: 'Invalid API key' };
  }
  return { ok: true };
}
