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

    const { data, error: supaError } = await supabase
      .from('tokens')
      .select('*')
      .eq('token', trimmed)
      .eq('is_active', true)
      .maybeSingle();

    setLoading(false);

    if (supaError || !data) {
      setError('Invalid or expired access token.');
      return;
    }

    // fire-and-forget update of last_used_at
    supabase
      .from('tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    if (typeof window !== 'undefined') {
      localStorage.setItem('pyp_token', trimmed);
      localStorage.setItem('pyp_token_label', data.label ?? '');
    }

    router.push('/coins');
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full border border-slate-500 flex items-center justify-center text-xs">
              PYP
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-[0.25em] uppercase">
            PYP: Strategic Edge
          </h1>
          <p className="text-sm text-slate-400">
            Enter your access token to begin the pilot scenario.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">
              Access Token
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="pypxxxxxx"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 py-2 text-sm font-semibold tracking-wide uppercase transition-colors"
          >
            {loading ? 'Validating…' : 'Enter'}
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-600 tracking-wide">
          TRL-4 Pilot · Token-gated access · No personal data stored
        </p>
      </div>
    </main>
  );
}
