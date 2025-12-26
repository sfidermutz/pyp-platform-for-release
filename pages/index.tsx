// pages/index.tsx
import React from 'react';
import dynamic from 'next/dynamic';

const TokenForm = dynamic(() => import('../components/TokenForm'), { ssr: false });
const SessionInfo = dynamic(() => import('../components/SessionInfo'), { ssr: false });

export default function Home() {
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
              <div className="mt-4">
                <TokenForm />
                <div style={{ marginTop: 12 }}>
                  <SessionInfo />
                </div>
              </div>
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
