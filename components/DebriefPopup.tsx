// components/DebriefPopup.tsx
'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function DebriefPopup({ debrief, onClose }: { debrief: any, onClose?: () => void }) {
  const router = useRouter();
  const score = debrief?.mission_score ?? 0;
  const line1 = debrief?.short_feedback?.line1 ?? `Mission Score: ${score}`;
  const line2 = debrief?.short_feedback?.line2 ?? `Decision Quality ${Math.round(debrief?.decision_quality ?? 0)} · CRI ${Math.round(debrief?.CRI ?? 0)}`;

  function getSessionId() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('pyp_session_id') ?? null;
  }

  function getScenarioIdFromDebriefOrPath() {
    // Prefer debrief scenario id if present
    if (debrief?.scenario_id) return String(debrief.scenario_id);
    if (typeof window !== 'undefined') {
      // Expect path like /scenario/HYB-01 or /scenario/HYB-01/
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        // If on /scenario/HYB-01, last segment is HYB-01
        return parts[parts.length - 1];
      }
    }
    return '';
  }

  function replay() {
    router.push(window.location.pathname + '?replay=1');
    if (onClose) onClose();
  }

  function openFull() {
    const sid = getSessionId();
    const scenarioId = getScenarioIdFromDebriefOrPath();
    if (sid && scenarioId) {
      router.push(`/debrief/${encodeURIComponent(sid)}/${encodeURIComponent(scenarioId)}`);
    } else {
      // If missing, explicitly warn and send back to coins
      alert('Unable to open full debrief (missing session or scenario id). Returning to home.');
      router.push('/coins');
    }
    if (onClose) onClose();
  }

  async function generateCertificate() {
    const sid = getSessionId();
    const scenarioId = getScenarioIdFromDebriefOrPath();
    if (!sid || !scenarioId) {
      alert('Cannot generate certificate: missing session or scenario id.');
      return;
    }

    try {
      const res = await fetch('/api/generate-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid, module_id: debrief?.module_id ?? 'MOD_HYBRID_GRAY', name: '' })
      });
      if (!res.ok) {
        // try to parse JSON error for clearer message
        let msg = res.statusText;
        try {
          const j = await res.json();
          msg = j?.error ?? j?.message ?? msg;
        } catch (e) {
          // ignore
        }
        alert('Certificate generation failed: ' + msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pyp_certificate.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert('Certificate generation failed (client): ' + (e?.message ?? String(e)));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={() => onClose?.()} />
      <div className="relative bg-[#071017] border border-slate-800 rounded-xl p-6 max-w-lg w-full z-10">
        <div className="text-center">
          <div className="text-xs text-slate-400 uppercase tracking-widest">Debrief</div>
          <div className="mt-4 text-5xl font-extrabold">{score}</div>
          <div className="mt-3 text-sm text-slate-300">{line1}</div>
          <div className="mt-1 text-sm text-slate-300">{line2}</div>

          <div className="mt-6 flex justify-center gap-4">
            <button onClick={replay} className="px-4 py-2 rounded text-sm bg-slate-700">Replay Scenario</button>
            <button onClick={openFull} className="px-4 py-2 rounded text-sm bg-sky-500 text-black">Open Full Debrief</button>
            <button onClick={generateCertificate} className="px-4 py-2 rounded text-sm bg-green-500 text-black">Generate Certificate</button>
          </div>
        </div>
      </div>
    </div>
  );
}
