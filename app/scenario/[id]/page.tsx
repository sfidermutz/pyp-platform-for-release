// app/scenario/[id]/page.tsx
'use client';

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
      </div>
    </main>
  );
}
