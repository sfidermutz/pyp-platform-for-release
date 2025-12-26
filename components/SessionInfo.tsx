'use client';

import React, { useEffect, useState } from 'react';

type AuthMe = {
  authenticated?: boolean;
  session_id?: string | null;
  token_id?: string | null;
  meta?: any;
};

export default function SessionInfo() {
  const [session, setSession] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
        const json = await r.json().catch(() => null);
        if (mounted) setSession(json);
      } catch (e) {
        if (mounted) setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;
  if (!session || !session.authenticated) return null;

  return (
    <div className="session-info" suppressHydrationWarning>
      <span>Session: {session.session_id ?? '(unknown)'}</span>
    </div>
  );
}
