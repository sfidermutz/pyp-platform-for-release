// app/verify/page.tsx
'use client';
import React, { useState } from 'react';

export default function VerifyPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    setLoading(true);
    try {
      const res = await fetch(`/api/verify?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        const j = await res.json();
        alert('Lookup failed: ' + (j?.error ?? res.statusText));
        setResult(null);
        setLoading(false);
        return;
      }
      const j = await res.json();
      setResult(j.certificate);
    } catch (e) {
      console.error(e);
      alert('Lookup error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold">Certificate Verification</h1>
        <p className="mt-2 text-slate-400">Enter a verification code (or scan the QR) to check certificate validity.</p>

        <div className="mt-6 flex gap-3">
          <input value={code} onChange={(e)=>setCode(e.target.value)} className="flex-1 p-3 rounded bg-slate-900 border border-slate-700" placeholder="Enter code e.g. ABC12345" />
          <button onClick={lookup} className="px-4 py-2 bg-sky-500 rounded text-black" disabled={loading}>{loading ? 'Checking…' : 'Verify'}</button>
        </div>

        {result && (
          <div className="mt-6 bg-[#071017] p-6 rounded border border-slate-800">
            <div className="text-sm text-slate-400">Module</div>
            <div className="text-lg font-bold">{result.module}</div>
            <div className="mt-2 text-sm text-slate-300">Completed on: {new Date(result.completed_on).toLocaleDateString()}</div>
            <div className="mt-1 text-sm text-slate-300">Valid until: {new Date(result.valid_until).toLocaleDateString()}</div>
            <div className="mt-4 text-sm text-slate-300">Module LO: {result.module_LO}</div>
            <div className="mt-6">
              <a href={`/api/verify?code=${encodeURIComponent(result.verification_code)}`} className="text-xs text-slate-400">Raw JSON</a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
