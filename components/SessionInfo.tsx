// components/SessionInfo.tsx
'use client';
import React, { useEffect, useState } from 'react';

type AuthResp = {
  authenticated: boolean;
  session_id?: string;
  token_id?: string;
  meta?: any;
};

export default function SessionInfo() {
  const [state, setState] = useState<AuthResp | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
        const j = await r.json();
        if (!cancelled) setState(j);
      } catch (e) {
        if (!cancelled) setState({ authenticated: false } as AuthResp);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === null) return <div>Checking session…</div>;
  if (!state.authenticated) return null;
  return (
    <div style={{ padding: 8 }}>
      <strong>Signed in</strong>
      <div>Session: {state.session_id}</div>
      <div>Token: {state.token_id}</div>
    </div>
  );
}
