// app/admin/debug/page.tsx
'use client';
import React, { useState } from 'react';

export default function AdminDebugPage() {
  const [response, setResponse] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [scenarioId, setScenarioId] = useState('HYB-01');
  const [sessionId, setSessionId] = useState('');

  async function runDebug() {
    setBusy(true);
    setResponse(null);
    try {
      const qs = new URLSearchParams();
      if (scenarioId) qs.set('scenario_id', scenarioId);
      if (sessionId) qs.set('session_id', sessionId);

      const res = await fetch(`/api/debug/store-test?${qs.toString()}`, {
        method: 'GET'
      });
      const json = await res.json();
      setResponse({ status: res.status, body: json });
    } catch (e) {
      setResponse({ status: 0, body: String(e) });
    } finally {
      setBusy(false);
    }
  }

  function pasteSessionFromLocalStorage() {
    try {
      const sid = localStorage.getItem('pyp_session_id') || '';
      setSessionId(sid);
      alert('Pasted session id from localStorage: ' + sid);
    } catch (e) {
      alert('Failed to access localStorage');
    }
  }

  return (
    <main className="min-h-screen p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Admin Debug</h1>
        <p className="mt-2 text-sm text-slate-400">Run a safe test insert into <code>public.scenario_metrics</code> and return DB error details.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400">Scenario ID</label>
            <input className="w-full mt-1 px-3 py-2 rounded bg-[#071017] border" value={scenarioId} onChange={(e)=>setScenarioId(e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-slate-400">Session ID (optional)</label>
            <input className="w-full mt-1 px-3 py-2 rounded bg-[#071017] border" value={sessionId} onChange={(e)=>setSessionId(e.target.value)} />
            <div className="mt-2 text-xs">
              <button onClick={pasteSessionFromLocalStorage} className="px-2 py-1 bg-slate-700 rounded text-sm">Paste from localStorage</button>
            </div>
          </div>

          <div className="flex items-end">
            <button onClick={runDebug} disabled={busy} className="px-4 py-2 bg-sky-500 rounded text-black">
              {busy ? 'Running…' : 'Run debug insert'}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold">Result</h3>
          <pre className="mt-3 p-3 bg-[#071017] border rounded text-xs" style={{whiteSpace:'pre-wrap'}}>
            {response ? JSON.stringify(response, null, 2) : 'No result yet'}
          </pre>
        </div>

      </div>
    </main>
  );
}
