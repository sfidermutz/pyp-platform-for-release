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

    // Fire-and-forget update of last_used_at
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
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md space-y-10">

        {/* LOGO – helmet + text baked into image */}
        <div className="flex justify-center">
          <img
            src="/PYPStrategicEdge-icon.png"
            alt="PYP: Strategic Edge Logo"
            className="w-auto max-h-[60vh]"
          />
        </div>

        {/* TOKEN FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs font-medium text-zinc-300">
            Enter your access token to begin.
          </p>

          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-zinc-300"
            placeholder="pypxxxxx"
            autoComplete="off"
          />

          {error && (
            <p className="text-sm text-red-400 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-zinc-200 hover:bg-zinc-300 disabled:bg-zinc-700 py-2 text-sm font-semibold tracking-wide uppercase transition-colors text-black"
          >
            {loading ? 'Validating…' : 'Enter'}
          </button>
        </form>

        {/* FOOTER */}
        <p className="text-[10px] text-center text-zinc-500 tracking-wide">
          Token-gated access · No personal identifying data stored
        </p>
      </div>
    </main>
  );
}
