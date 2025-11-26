// app/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = token.trim();
    if (!trimmed) {
      setError('Please enter your access token.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: supaError } = await supabase
        .from('tokens')
        .select('*')
        .eq('token', trimmed)
        .eq('is_active', true)
        .maybeSingle();

      if (supaError || !data) {
        setLoading(false);
        setError('Invalid or expired access token.');
        return;
      }

      const res = await fetch('/api/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmed })
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to create session');
        setLoading(false);
        return;
      }
      const session = json.session;

      if (typeof window !== 'undefined') {
        localStorage.setItem('pyp_token', trimmed);
        localStorage.setItem('pyp_token_label', (data && data.label) ? data.label : '');
        localStorage.setItem('pyp_session_id', session.id);
      }

      try {
        await fetch('/api/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.id,
            event_type: 'page_view',
            payload: { page: 'landing', token_label: (data && data.label) ? data.label : null }
          })
        });
      } catch (_) {}

      router.push('/coins');
    } catch (err) {
      console.error('session create err', err);
      setError('Server error creating session');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-start justify-center px-4 pt-14">
      <div className="w-full max-w-2xl text-center">
        {/* Big centered logo (no decorative circle, large) */}
        <div className="mx-auto w-56 h-56 mb-6">
          <img
            src="/PYPStrategicEdge-icon.png"
            alt="PYP Strategic Edge"
            className="w-full h-full object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        <h1 className="text-6xl font-extrabold tracking-widest uppercase leading-tight mb-10">PYP: Strategic Edge</h1>

        <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Access Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Enter token"
              autoComplete="off"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 py-3 text-sm font-semibold uppercase tracking-wide"
          >
            {loading ? 'Validating…' : 'Enter'}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-500 tracking-wide mt-8">
          TRL-4 Pilot · Token-gated access · No personal data stored
        </p>
      </div>
    </main>
  );
}
