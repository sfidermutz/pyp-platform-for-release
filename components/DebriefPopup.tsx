'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DebriefPopup({ debrief, onClose }: { debrief: any, onClose?: () => void }) {
  const router = useRouter();
  const score = debrief?.mission_score ?? 0;
  const line1 = debrief?.short_feedback?.line1 ?? `Mission Score: ${score}`;
  const line2 = debrief?.short_feedback?.line2 ?? `Decision Quality ${Math.round(debrief?.decision_quality ?? 0)} · CRI ${Math.round(debrief?.CRI ?? 0)}`;

  function replay() {
    router.push(window.location.pathname + '?replay=1');
    if (onClose) onClose();
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
            <Link href="/coins" className="px-4 py-2 rounded text-sm bg-sky-500 text-black">Go to Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
