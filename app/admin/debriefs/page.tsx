// app/admin/debriefs/page.tsx
'use client';
import React, { useEffect, useState } from 'react';

type DebriefRow = {
  id: string;
  session_id: string;
  scenario_id: string;
  metrics: any;
  short_feedback: any;
  reflection: string;
  created_at: string;
};

export default function AdminDebriefsPage() {
  const [apiKey, setApiKey] = useState<string>('');
  const [storedKey, setStoredKey] = useState<string>('');
  const [rows, setRows] = useState<DebriefRow[]>([]);
  const [count, setCount] = useState<number>(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DebriefRow | null>(null);
  const [filterScenario, setFilterScenario] = useState('');

  useEffect(() => {
    const key = sessionStorage.getItem('pyp_admin_api_key') || '';
    setStoredKey(key);
    setApiKey('');
  }, []);

  async function saveKey() {
    sessionStorage.setItem('pyp_admin_api_key', apiKey);
    setStoredKey(apiKey);
    setApiKey('');
  }

  async function fetchPage(p = 0) {
    if (!storedKey) {
      alert('Enter ADMIN API key first.');
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(limit));
      qs.set('offset', String(p * limit));
      if (filterScenario) qs.set('scenario_id', filterScenario);
      const res = await fetch(`/api/admin/debriefs?${qs.toString()}`, {
        headers: { 'x-api-key': storedKey }
      });
      if (!res.ok) {
        const txt = await res.text();
        alert(`Failed to load: ${res.status} ${txt}`);
        setRows([]);
        setCount(0);
        return;
      }
      const json = await res.json();
      setRows(json.rows || []);
      setCount(json.count || 0);
      setPage(p);
    } catch (e) {
      console.error(e);
      alert('Failed to fetch debriefs');
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (storedKey) fetchPage(0);
  }, [storedKey]);

  async function exportCsv() {
    if (!storedKey) return alert('Enter ADMIN API key first.');
    const qs = new URLSearchParams();
    qs.set('format', 'csv');
    if (filterScenario) qs.set('scenario_id', filterScenario);
    const res = await fetch(`/api/admin/debriefs?${qs.toString()}`, {
      headers: { 'x-api-key': storedKey }
    });
    if (!res.ok) {
      const txt = await res.text();
      return alert(`Export failed: ${res.status} ${txt}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debriefs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteRow(id: string) {
    if (!storedKey) return alert('Enter ADMIN API key first.');
    if (!confirm('Delete debrief? This is permanent.')) return;
    try {
      const res = await fetch('/api/debrief/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': storedKey },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        const txt = await res.text();
        alert(`Delete failed: ${res.status} ${txt}`);
        return;
      }
      await fetchPage(page);
      alert('Deleted');
    } catch (e) {
      console.error(e);
      alert('Delete failed');
    }
  }

  return (
    <main className="min-h-screen p-6 bg-black text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold">Admin: Debriefs</h1>

        <div className="mt-4 flex items-center gap-3">
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste ADMIN_API_KEY here" className="px-3 py-2 bg-[#071017] rounded border" />
          <button onClick={saveKey} className="px-3 py-2 bg-sky-500 rounded text-black">Save key (session)</button>
          <div className="ml-6 text-sm text-slate-400">Stored key: {storedKey ? 'yes' : 'no'}</div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <input value={filterScenario} onChange={(e) => setFilterScenario(e.target.value)} placeholder="Filter scenario_id (optional)" className="px-3 py-2 bg-[#071017] rounded border" />
          <button onClick={() => fetchPage(0)} className="px-3 py-2 bg-sky-500 rounded text-black">Filter</button>
          <button onClick={exportCsv} className="px-3 py-2 bg-green-500 rounded text-black">Export CSV</button>
        </div>

        <div className="mt-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs text-slate-400">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Scenario</th>
                <th className="px-3 py-2">Mission</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-xs">{r.id}</td>
                  <td className="px-3 py-2 text-xs">{r.session_id}</td>
                  <td className="px-3 py-2 text-xs">{r.scenario_id}</td>
                  <td className="px-3 py-2 text-xs">{r.metrics?.mission_score ?? '-'}</td>
                  <td className="px-3 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs">
                    <button onClick={() => setSelected(r)} className="px-2 py-1 bg-slate-700 rounded mr-2">View</button>
                    <button onClick={() => deleteRow(r.id)} className="px-2 py-1 bg-red-700 rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-400">Showing {rows.length} / {count}</div>
            <div className="flex items-center gap-2">
              <button disabled={page === 0} onClick={() => fetchPage(page - 1)} className="px-3 py-1 bg-slate-700 rounded">Prev</button>
              <button disabled={(page+1)*limit >= count} onClick={() => fetchPage(page + 1)} className="px-3 py-1 bg-slate-700 rounded">Next</button>
            </div>
          </div>
        </div>

        {selected && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
            <div className="bg-[#071017] border border-slate-800 rounded p-6 max-w-3xl w-full">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Debrief {selected.id}</h2>
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
