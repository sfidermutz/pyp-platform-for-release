// components/TokenForm.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function TokenForm({ onSuccess }: { onSuccess?: (sessionId: string) => void }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // on mount, check auth and redirect if already authenticated
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!r.ok) return;
        const j = await r.json().catch(() => null);
        if (!cancelled && j && j.authenticated) {
          router.push('/coins');
        }
      } catch (e) {
        // ignore, show form
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError('Please enter your access token.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ token: token.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setError(body?.error || 'Invalid token or server error');
        setLoading(false);
        return;
      }
      // Verify session quickly
      const me = await fetch('/api/auth/me', { credentials: 'same-origin' });
      const jm = await me.json().catch(() => null);
      if (!jm || !jm.authenticated) {
        setError('Authentication failed after session creation');
        setLoading(false);
        return;
      }
      if (onSuccess) onSuccess(jm.session_id);
      router.push('/coins');
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <label style={{ display: 'block', marginBottom: 6 }}>Access Token</label>
      <input
        aria-label="token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Enter token"
        style={{ width: '100%', padding: 6 }}
      />
      {error && <div style={{ color: 'salmon', marginTop: 8 }}>{error}</div>}
      <div style={{ marginTop: 10 }}>
        <button type="submit" disabled={loading}>
          {loading ? 'Entering...' : 'Enter'}
        </button>
      </div>
      <div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
        Example tokens (dev): <code>123456</code>, <code>654321</code>
      </div>
    </form>
  );
}
