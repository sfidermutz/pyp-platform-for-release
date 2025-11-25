'use client';

import React from 'react';
import Link from 'next/link';

type ScenarioPageProps = {
  params: {
    id: string;
  };
};

export default function ScenarioPage({ params }: ScenarioPageProps) {
  const { id } = params;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        <p className="text-[10px] tracking-[0.35em] uppercase text-neutral-500 mb-4">
          PYP: STRATEGIC EDGE · TRL-4 PILOT
        </p>
        <h1 className="text-3xl font-semibold tracking-[0.25em] uppercase mb-4">
          Module Coin #{id}
        </h1>
        <p className="text-sm text-neutral-300 mb-8">
          Placeholder scenario view for coin <span className="font-mono">#{id}</span>. <br />
          We&apos;ll later wire this to the actual scenario text, decision points, and metrics
          for the selected module.
        </p>

        <Link
          href="/coins"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-black text-xs tracking-[0.25em] uppercase hover:bg-neutral-200 transition"
        >
          Back to Challenge Coins
        </Link>
      </div>
    </main>
  );
}
