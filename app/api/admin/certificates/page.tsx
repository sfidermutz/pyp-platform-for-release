// app/admin/certificates/page.tsx
'use client';
import React, { useEffect, useState } from 'react';

type CertRow = {
  id: string;
  session_id: string;
  module: string;
  verification_code: string;
  completed_on: string;
  valid_until: string;
  ects: number | string;
  module_lo?: string;
  created_at: string;
};

export default function AdminCertificatesPage() {
  const [apiKey, setApiKey] = useState('');
  const [storedKey, setStoredKey] = useState('');
  const [rows, setRows] = useState<CertRow[]>([]);
  const [count, setCount] = useState<number>(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CertRow | null>(null);

  useEffect(() => {
    const key = sessionStorage.getItem('pyp_admin_api_key') || '';
    setStoredKey(key);
  }, []);

  async function saveKey() {
    sessionStorage.setItem('pyp_admin_api_key', apiKey);
    setStoredKey(apiKey);
    setApiKey('');
  }

  async function fetchPage(p = 0) {
    if (!storedKey) return alert('Enter ADMIN API key first');
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(limit));
      qs.set('offset', String(p * limit));
      const res = await fetch(`/api/admin/certificates?${qs.toString()}`, { headers: { 'x-api-key': storedKey }});
      if (!res.ok) {
        const txt = await res.text();
        alert(`Failed to load: ${res.status} ${txt}`);
        setRows([]); setCount(0); setLoading(false);
        return;
      }
      const json = await res.json();
      setRows(json.rows || []);
      setCount(json.count || 0);
      setPage(p);
    } catch (e) {
      console.error(e);
      alert('Failed to fetch certificates');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (storedKey) fetchPage(0);
  }, [storedKey]);

  async function revoke(id: string) {
    if (!storedKey) return alert('Enter ADMIN API key first');
    if (!confirm('Revoke this certificate?')) return;
    try {
      const res = await fetch('/api/admin/certificates/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': storedKey },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        const txt = await res.text();
        alert(`Revoke failed: ${res.status} ${txt}`);
      } else {
        alert('Revoked');
        fetchPage(page);
      }
    } catch (e) {
      console.error(e);
      alert('Revoke failed');
    }
  }

  async function exportCsv() {
    if (!storedKey) return alert('Admin key required');
    const qs = new URLSearchParams();
    qs.set('format', 'csv');
    const res = await fetch(`/api/admin/certificates?${qs.toString()}`, { headers: { 'x-api-key': storedKey }});
    if (!res.ok) {
      const txt = await res.text();
      return alert(`Export failed: ${res.status} ${txt}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificates_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen p-6 bg-black text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold">Admin: Certificates</h1>

        <div className="mt-4 flex items-center gap-3">
          <input value={apiKey} onChange={(e)=>setApiKey(e.target.value)} placeholder="Paste ADMIN_API_KEY here" className="px-3 py-2 bg-[#071017] rounded border" />
          <button onClick={saveKey} className="px-3 py-2 bg-sky-500 rounded text-black">Save key (session)</button>
          <div className="ml-6 text-sm text-slate-400">Stored key: {storedKey ? 'yes' : 'no'}</div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => fetchPage(0)} className="px-3 py-2 bg-sky-500 rounded text-black">Refresh</button>
          <button onClick={exportCsv} className="px-3 py-2 bg-green-500 rounded text-black">Export CSV</button>
        </div>

        <div className="mt-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs text-slate-400">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Valid Until</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-xs">{r.id}</td>
                  <td className="px-3 py-2 text-xs">{r.session_id}</td>
                  <td className="px-3 py-2 text-xs">{r.module}</td>
                  <td className="px-3 py-2 text-xs">{r.verification_code}</td>
                  <td className="px-3 py-2 text-xs">{new Date(r.valid_until).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs">
                    <button onClick={() => setSelected(r)} className="px-2 py-1 bg-slate-700 rounded mr-2">View</button>
                    <button onClick={() => revoke(r.id)} className="px-2 py-1 bg-red-700 rounded">Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-400">Showing {rows.length} / {count}</div>
            <div className="flex items-center gap-2">
              <button disabled={page===0} onClick={() => fetchPage(page-1)} className="px-3 py-1 bg-slate-700 rounded">Prev</button>
              <button disabled={(page+1)*limit >= count} onClick={() => fetchPage(page+1)} className="px-3 py-1 bg-slate-700 rounded">Next</button>
            </div>
          </div>
        </div>

        {selected && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
            <div className="bg-[#071017] border border-slate-800 rounded p-6 max-w-3xl w-full">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Certificate {selected.id}</h2>
                <button onClick={() => setSelected(null)} className="px-2 py-1 bg-slate-700 rounded">Close</button>
              </div>
              <div className="mt-4 text-sm">
                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(selected, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
