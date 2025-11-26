// components/ScenarioEngine.tsx
'use client';
import React, { useState, useEffect } from 'react';
import DebriefPopup from './DebriefPopup';

export default function ScenarioEngine({ scenario, scenarioId }: { scenario: any, scenarioId: string }) {
  const [screen, setScreen] = useState<number>(1);
  const [selections, setSelections] = useState<any>({});
  const [startTimes, setStartTimes] = useState<any>({});
  const [reflection, setReflection] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStartTimes((prev: any) => ({ ...prev, [1]: Date.now() }));
  }, []);

  function optionSelected(dpIndex: number, optionId: string, confidence?: number) {
    const now = Date.now();
    const timeOnPage = startTimes[dpIndex] ? now - startTimes[dpIndex] : 0;
    setSelections((prev: any) => ({
      ...prev,
      [dpIndex]: { optionId, confidence: confidence ?? prev?.[dpIndex]?.confidence ?? 50, timeMs: timeOnPage }
    }));
  }

  // Helper to build a DP object with .narrative .stem and .options array
  function normalizeDP(dpRaw: any): { narrative?: string; stem?: string; options: any[] } {
    if (!dpRaw) return { narrative: '', stem: '', options: [] };
    // If dpRaw already has options
    if (Array.isArray(dpRaw.options)) return dpRaw;
    // If dpRaw itself is an array (legacy)
    if (Array.isArray(dpRaw)) return { narrative: '', stem: '', options: dpRaw };
    // Otherwise dpRaw is an object that maps keys -> array (branching)
    // We'll not include narrative/stem from each branch (they're usually on root),
    return { narrative: dpRaw.narrative ?? '', stem: dpRaw.stem ?? '', options: [] };
  }

  // dpFor: returns the dp object for DP index i.
  // Handles both flat and branching dp2/dp3 structures.
  function dpFor(i: number) {
    // DP1 is always simple
    if (i === 1) return normalizeDP(scenario.dp1);

    if (i === 2) {
      const raw = scenario.dp2;
      if (!raw) return { narrative: '', stem: '', options: [] };

      // If dp2 is an array or object with options, normalize and return
      if (Array.isArray(raw) || Array.isArray(raw?.options)) {
        return normalizeDP(raw);
      }

      // dp2 is a branching map keyed by dp1 option ids
      const prev1 = selections[1]?.optionId;
      // If we have a branch that matches prev1, use it
      if (prev1 && Array.isArray(raw[prev1])) {
        return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw[prev1] };
      }

      // Fallback: if there is a default branch
      if (raw.default && Array.isArray(raw.default)) {
        return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw.default };
      }

      // Final fallback: combine all branch options into a single list (keeps demo working)
      const combined: any[] = Object.values(raw).flat().filter((v: any) => Array.isArray(v) || v);
      // If combined contains nested objects (not arrays), flatten those arrays too:
      const opts = ([] as any[]).concat(...combined.map((c: any) => Array.isArray(c) ? c : []));
      return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: opts };
    }

    // DP3: similar logic keyed by DP2 selection
    if (i === 3) {
      const raw = scenario.dp3;
      if (!raw) return { narrative: '', stem: '', options: [] };

      if (Array.isArray(raw) || Array.isArray(raw?.options)) {
        return normalizeDP(raw);
      }

      const prev2 = selections[2]?.optionId;
      if (prev2 && Array.isArray(raw[prev2])) {
        return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw[prev2] };
      }

      if (raw.default && Array.isArray(raw.default)) {
        return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw.default };
      }

      const combined: any[] = Object.values(raw).flat().filter((v: any) => Array.isArray(v) || v);
      const opts = ([] as any[]).concat(...combined.map((c: any) => Array.isArray(c) ? c : []));
      return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: opts };
    }

    return { narrative: '', stem: '', options: [] };
  }

  // Persist reflection to server (small helper)
  async function persistReflection(sessionId: string | null, scenario_id: string, phase: string, text: string) {
    try {
      await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          scenario_id,
          reflection_phase: phase,
          reflection_text: text
        })
      });
    } catch (e) {
      console.debug('persistReflection failed', e);
    }
  }

  async function goNext() {
    setError(null);
    if (screen === 1 || screen === 2) {
      const sel = selections[screen];
      if (!sel || !sel.optionId) { setError('Please select an option and set confidence before continuing.'); return; }

      try {
        await fetch('/api/decisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_hint: typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null,
            scenario_id: scenarioId,
            decision_point: screen,
            selected_option_id: sel.optionId,
            confidence: sel.confidence,
            time_on_page_ms: sel.timeMs,
            details: { step: screen }
          })
        });
      } catch (e) {
        console.debug('decision post failed', e);
      }

      const next = screen + 1;
      setScreen(next);
      setStartTimes((prev: any) => ({ ...prev, [next]: Date.now() }));
      return;
    }

    if (screen === 3) {
      const sel = selections[3];
      if (!sel || !sel.optionId) { setError('Please select an option and set confidence before continuing.'); return; }
      const wordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 50) { setError('Reflection must be at least 50 words.'); return; }

      setSubmitting(true);
      try {
        try {
          await fetch('/api/decisions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_hint: typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null,
              scenario_id: scenarioId,
              decision_point: 3,
              selected_option_id: sel.optionId,
              confidence: sel.confidence,
              time_on_page_ms: sel.timeMs,
              details: { step: 3 }
            })
          });
        } catch (e) { console.debug('decision post failed', e); }

        const session_hint = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;

        // Persist pre-reflection stub (if applicable) - optional
        try {
          await persistReflection(session_hint, scenarioId, 'pre', '');
        } catch (e) { /* ignore */ }

        const res = await fetch('/api/compute-debrief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_hint: session_hint,
            scenario_id: scenarioId,
            selections,
            reflection,
            scenario
          })
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error || 'Failed to compute debrief');
          setDebrief(null);
        } else {
          setDebrief(json);

          // persist the reflection on server
          try {
            await persistReflection(session_hint, scenarioId, 'post', reflection);
          } catch (e) {
            console.debug('persist post reflection failed', e);
          }

          // persist metrics for dashboard
          try {
            await fetch('/api/store-scenario-metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: session_hint, scenario_id: scenarioId, metrics: json })
            });
          } catch (e) {
            console.debug('store scenario metrics failed', e);
          }

          // Save debrief to localStorage for the full debrief page
          try {
            const sid = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;
            if (sid) {
              localStorage.setItem(`pyp_debrief_${sid}_${scenarioId}`, JSON.stringify(json));
            }
          } catch (e) {
            console.debug('saving debrief to localStorage failed', e);
          }
        }
      } catch (e) {
        console.error(e);
        setError('Server error computing debrief');
        setDebrief(null);
      } finally {
        setSubmitting(false);
      }
    }
  }

  function onSelectOption(dpIndex: number, optionId: string) {
    optionSelected(dpIndex, optionId, selections[dpIndex]?.confidence ?? 50);
  }
  function onConfidenceChange(dpIndex:number, val:number) {
    optionSelected(dpIndex, selections[dpIndex]?.optionId ?? '', val);
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#071017] border border-[#202933] rounded-xl p-6">
        <p className="text-xs text-slate-400 tracking-[0.24em] uppercase">Scenario</p>
        <h2 className="text-2xl font-semibold mt-2">{scenario.title}</h2>
        <div className="mt-6">
          <div className="space-y-4">
            {[1,2,3].map((i) => {
              const dp = dpFor(i);
              const isCurrent = i === screen;
              const isLocked = i < screen;
              const selected = selections[i];
              return (
                <div key={i} className={`rounded-md p-4 border ${isCurrent ? 'border-sky-500 bg-[#071820]' : 'border-slate-700 bg-[#071016]'}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{`DP${i}`}</div>
                    {isLocked ? <div className="text-[10px] text-slate-400 uppercase tracking-wider">Locked</div> : null}
                  </div>

                  <p className="mt-3 text-sm text-slate-300">{dp.narrative}</p>
                  <p className="mt-3 text-sm text-sky-300 font-medium">{dp.stem}</p>

                  <div className="mt-4 grid gap-3">
                    {dp.options.map((opt: any) => {
                      const chosen = selected?.optionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => { if (!isLocked && isCurrent) onSelectOption(i, opt.id); }}
                          className={`text-left w-full px-3 py-3 rounded-md border ${chosen ? 'border-sky-500 bg-sky-700/10' : 'border-slate-700'} hover:bg-slate-800 transition`}
                          aria-pressed={chosen}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm">{opt.text}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider">Confidence</label>
                    <div className="mt-2 flex items-center gap-4">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={selections[i]?.confidence ?? 50}
                        onChange={(e) => onConfidenceChange(i, Number(e.target.value))}
                        disabled={!isCurrent}
                        className="flex-1"
                      />
                      <div className="w-12 text-right text-xs">{selections[i]?.confidence ?? 50}%</div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {screen === 3 && (
          <div className="mt-6">
            <label className="block text-sm font-semibold">Reflection</label>
            <p className="text-sm text-slate-300 mt-2">{scenario.reflections?.pre?.prompt ?? scenario.reflection1_prompt}</p>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="mt-3 w-full min-h-[160px] rounded-md bg-slate-900 border border-slate-700 p-3 text-sm"
              placeholder="Write at least 50 words reflecting on your decisions and confidence."
            />
            <div className="text-xs text-slate-400 mt-2">Words: {reflection.trim().split(/\s+/).filter(Boolean).length} (min 50)</div>
          </div>
        )}

        {error && <div className="mt-4 text-sm text-rose-400">{error}</div>}

        <div className="mt-6 flex justify-end">
          <button
            onClick={goNext}
            className="px-5 py-2 rounded-md bg-sky-500 text-black font-semibold"
            disabled={submitting}
          >
            {screen < 3 ? 'NEXT' : (submitting ? 'Submitting…' : 'Submit Reflection')}
          </button>
        </div>
      </div>

      {debrief && <DebriefPopup debrief={debrief} onClose={() => setDebrief(null)} />}
    </div>
  );
}
