import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lightweight CORS middleware for API routes.
// Matches only /api/* and responds to OPTIONS (preflight) requests.
export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';

  // Answer preflight OPTIONS requests early
  if (req.method === 'OPTIONS') {
    const res = NextResponse.json(null);
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, x-debug, x-api-key');
    res.headers.set('Access-Control-Max-Age', '86400');
    return res;
  }

  // For normal requests: let the request continue, but include CORS headers on the response
  const res = NextResponse.next();
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, x-debug, x-api-key');
  return res;
}

// Limit the middleware to API routes only
export const config = { matcher: '/api/:path*' };
