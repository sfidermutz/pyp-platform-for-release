// app/scenario/[id]/page.tsx
import React from 'react';
import path from 'path';
import fs from 'fs';
import ScenarioEngine from '@/components/ScenarioEngine';

export const runtime = 'nodejs';

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

    // Diagnostic logging for Vercel runtime logs
    const exists = fs.existsSync(filePath);
    let raw = '';
    if (exists) {
      raw = fs.readFileSync(filePath, 'utf8');
    }
    // Log file diagnostic info so we can see what's happening on Vercel
    console.log('Scenario debug: filePath=', filePath, 'exists=', exists, 'bytes=', raw.length, 'preview=', raw.slice(0, 300).replace(/\n/g, '\\n'));

    if (!exists) {
      return (
        <div className="min-h-screen flex items-center justify-center text-white bg-black">
          Scenario not found.
        </div>
      );
    }

    // strip BOM if present
    const cleaned = raw.replace(/^\uFEFF/, '');

    const content = JSON.parse(cleaned);

    return (
      <main className="min-h-screen bg-black text-white px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <ScenarioEngine scenario={content} scenarioId={id} />
        </div>
      </main>
    );
  } catch (err) {
    // Safe error logging
    let errMsg: string;
    if (err && typeof err === 'object') {
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
