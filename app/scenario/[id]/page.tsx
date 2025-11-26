// app/scenario/[id]/page.tsx
import React from 'react';
import path from 'path';
import fs from 'fs';
import ScenarioEngine from '@/components/ScenarioEngine';

export const runtime = 'nodejs'; // ensure Node runtime so fs is allowed

type Props = { params: { id: string } };

export default async function ScenarioPage({ params }: Props) {
  const id = params?.id;

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Scenario not found.
      </div>
    );
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'scenarios', `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return (
        <div className="min-h-screen flex items-center justify-center text-white bg-black">
          Scenario not found.
        </div>
      );
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // ScenarioEngine is a client component — passing the scenario as a prop is fine.
    return (
      <main className="min-h-screen bg-black text-white px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <ScenarioEngine scenario={content} scenarioId={id} />
        </div>
      </main>
    );
  } catch (err) {
    // Safe extraction of stack/message for unknown error types
    let errMsg: string;
    if (err && typeof err === 'object') {
      // if it's an Error-like object, prefer stack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyErr: any = err;
      errMsg = anyErr?.stack ?? JSON.stringify(anyErr);
    } else {
      try {
        errMsg = JSON.stringify(err);
      } catch {
        errMsg = String(err);
      }
    }
    console.error('Error reading scenario file', errMsg);
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Scenario not found.
      </div>
    );
  }
}
