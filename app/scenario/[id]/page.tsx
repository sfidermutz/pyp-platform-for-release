'use client';

 codex/add-session-telemetry-and-api-routes-esaz5j
import React, { useEffect, useState } from 'react';
import ScenarioEngine from '@/components/ScenarioEngine';
import { useRouter } from 'next/navigation';

export default function ScenarioPage({ params }: { params: { id: string }}) {
  const { id } = params;
  const [scenario, setScenario] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/scenario/${encodeURIComponent(id)}`);
        if (!res.ok) {
          console.error('Failed to fetch scenario');
          setScenario(null);
        } else {
          const json = await res.json();
          setScenario(json.scenario);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white bg-black">Loading scenario…</div>;
  if (!scenario) return <div className="min-h-screen flex items-center justify-center text-white bg-black">Scenario not found.</div>;

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <ScenarioEngine scenario={scenario} scenarioId={id} />
=======
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
 main
      </div>
    </main>
  );
}
