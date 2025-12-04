import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState<string>('');
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
        localStorage.setItem('pyp_token_label', data?.label || '');
        localStorage.setItem('pyp_session_id', session.id);
      }

      try {
        await fetch('/api/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.id,
            event_type: 'page_view',
            payload: { page: 'landing', token_label: data?.label || null }
          })
        });
      } catch (err) {
        // Ignore logging errors
        console.warn('log-event failed', err);
      }

      router.push('/coins');
    } catch (err) {
      console.error('session create err', err);
      setError('Server error creating session');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-start pt-12 px-6">
      <div className="w-full max-w-6xl">
        <header className="hero bg-gradient-to-b from-[#0b0f12] to-[#071017] rounded-2xl p-10 flex flex-col md:flex-row items-center gap-8">
          <div className="hero-left flex-1 flex items-center gap-6">
            <div>
              <h1 className="h1-brand text-4xl md:text-5xl text-white leading-tight">Pick Your Path — <span className="text-sky-300">Strategic Edge</span></h1>
              <p className="mt-3 text-slate-300 max-w-xl">
                Train decision advantage under hybrid pressure. Adaptive scenarios, measurable metrics, and actionable debriefs — designed for operators and staff.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="px-4 py-2 border border-slate-700 rounded text-slate-200">Demo modules are token-gated. Enter your access token to proceed.</span>
              </div>
            </div>
          </div>

          <div className="hero-form w-full md:w-96 bg-[#071820] border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold">Enter access token</h2>
            <p className="mt-1 text-xs text-slate-400">Token-gated demo access · TRL-4 pilot</p>

            <form onSubmit={handleSubmit} className="mt-4">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Access Token</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Enter token"
                autoComplete="off"
              />
              {error && <p className="text-sm text-rose-400 mt-2">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-md bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 py-3 text-sm font-semibold uppercase tracking-wide"
              >
                {loading ? 'Validating…' : 'Enter'}
              </button>

              <p className="text-[11px] text-center text-slate-500 tracking-wide mt-3">
                TRL-4 Pilot · Token-gated access · No personal data stored
              </p>
            </form>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#071017] border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold">Why PYP</h3>
            <p className="mt-2 text-slate-300 text-sm">Measure decision quality, bias awareness, and cognitive readiness across realistic hybrid scenarios.</p>
          </div>
          <div className="bg-[#071017] border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold">For Instructors</h3>
            <p className="mt-2 text-slate-300 text-sm">Author scenarios, review debriefs, and guide cohort learning with actionable metrics.</p>
          </div>
          <div className="bg-[#071017] border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold">For Practitioners</h3>
            <p className="mt-2 text-slate-300 text-sm">Practice stressful decisions and receive targeted feedback you can trust.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
