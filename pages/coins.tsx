// pages/coins.tsx
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

const SessionInfo = dynamic(() => import('../components/SessionInfo'), { ssr: false });

export default function CoinsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // read session from local storage (the landing page stores this if token validated)
    const sid = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;
    if (!sid) {
      // no session — go back to landing
      router.replace('/');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Challenge Coin / Landing</h1>
      <div className="mt-2 muted">
        <SessionInfo />
      </div>

      <div className="mt-6 panel">
        <h2 className="text-lg font-semibold">Module Quick Links</h2>
        <ul className="mt-3">
          <li><a className="text-accent" href="/modules/HYB-RED-01">Hybrid Module (HYB)</a></li>
          <li><a className="text-accent" href="/modules/HYB">HYB (alias)</a></li>
        </ul>
      </div>

      <div className="mt-6 panel">
        <h2 className="text-lg font-semibold">Notes</h2>
        <p className="muted mt-2">This page was added as a safe landing after token validation. Replace with your real challenge-coin UI when ready.</p>
      </div>
    </div>
  );
}
