import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = token.trim();
    if (!t) return setError('Please enter your access token.');

    setLoading(true);

    try {
      const res = await fetch('/api/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ token: t })
      });
      let json: any = {};
      try { json = await res.json(); } catch (e) { console.warn('create-session parse error', e); }
      if (!res.ok) {
        setError(json?.error || 'Invalid token or server error');
        setLoading(false);
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('pyp_token', t);
        localStorage.setItem('pyp_session_id', json.session?.id || '');
      }
      router.push('/coins');
    } catch (err) {
      console.error('create-session error', err);
      setError('Server error - try again');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-start justify-start pt-12 px-6">
      <div className="w-full max-w-6xl">
        <header className="panel rounded-2xl p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h1 className="h1 text-3xl">Pick Your Path — Strategic Edge</h1>
              <p className="muted small mt-2">
                Token-gated pilot access. Enter your token to start the TRL-4 pilot experience.
              </p>
            </div>

            <div className="w-full md:w-96 bg-[#071820] panel">
              <h2 className="text-lg font-semibold">Enter access token</h2>
              <form onSubmit={handleSubmit} className="mt-4">
                <label className="block text-xs font-medium muted mb-2">Access Token</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                  placeholder="Enter token"
                  autoComplete="off"
                />
                {error && <p className="text-sm text-rose-400 mt-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 w-full rounded-md bg-accent py-2 text-sm font-semibold text-black"
                >
                  {loading ? 'Validating…' : 'Enter'}
                </button>
                <p className="text-[11px] muted mt-3">TRL-4 Pilot · Token-gated access</p>
              </form>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="panel">
            <h3 className="text-lg font-semibold">Why PYP</h3>
            <p className="mt-2 muted small">Measure decision quality, bias awareness and cognitive readiness across realistic hybrid scenarios.</p>
          </div>
          <div className="panel">
            <h3 className="text-lg font-semibold">For Instructors</h3>
            <p className="mt-2 muted small">Author scenarios, run cohorts and review debriefs with actionable metrics.</p>
          </div>
          <div className="panel">
            <h3 className="text-lg font-semibold">For Practitioners</h3>
            <p className="mt-2 muted small">Practice hard decisions, see where you can improve, and track progress.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
