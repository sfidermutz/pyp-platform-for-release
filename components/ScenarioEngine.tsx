// components/ScenarioEngine.tsx
'use client';
import React, { useState, useEffect } from 'react';
import DebriefPopup from './DebriefPopup';

/**
 * ScenarioEngine (reworked)
 *
 * - Option clicks only update local state (selection sequences & counts).
 * - Only the NEXT button locks the DP and POSTs a single definitive record to /api/decisions/lock.
 * - Confidence is 1-5, initial state = null; user blocked from proceeding until set.
 *
 * TODO: BETH: Add brand color tokens here (primary/accent) — placeholder used in classes.
 */

function makeLocalSessionId() {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return 's_' + Math.random().toString(36).slice(2, 10);
}

export default function ScenarioEngine({ scenario, scenarioId }: { scenario: any; scenarioId: string }) {
  const [screen, setScreen] = useState<number>(1); // which DP user is on (1..3)
  const [selections, setSelections] = useState<Record<number, { optionId?: string; confidence?: number | null; timeMs?: number }>>({});
  const [selectionSequences, setSelectionSequences] = useState<Record<number, string[]>>({});
  const [changeCounts, setChangeCounts] = useState<Record<number, number>>({});
  const [selectionFirstTimes, setSelectionFirstTimes] = useState<Record<number, number | null>>({});
  const [startTimes, setStartTimes] = useState<Record<number, number>>({});
  const [confidenceChangeCounts, setConfidenceChangeCounts] = useState<Record<number, number>>({});
  const [reflection, setReflection] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // ensure session id exists in localStorage (client-only)
    if (typeof window !== 'undefined') {
      try {
        const existing = localStorage.getItem('pyp_session_id');
        if (!existing) {
          const newSid = makeLocalSessionId();
          localStorage.setItem('pyp_session_id', newSid);
          console.log('[ScenarioEngine] created new session id', newSid);
        } else {
          console.log('[ScenarioEngine] found existing session id', existing);
        }
      } catch (e) {
        console.warn('[ScenarioEngine] localStorage unavailable', e);
      }
    }
    // initialize start time for DP1
    setStartTimes((prev: any) => ({ ...prev, [1]: Date.now() }));
  }, []);

  function normalizeDP(dpRaw: any): { narrative?: string; stem?: string; options: any[] } {
    if (!dpRaw) return { narrative: '', stem: '', options: [] };
    if (Array.isArray(dpRaw?.options)) return dpRaw;
    if (Array.isArray(dpRaw)) return { narrative: '', stem: '', options: dpRaw };
    return { narrative: dpRaw.narrative ?? '', stem: dpRaw.stem ?? '', options: [] };
  }

  function dpFor(i: number) {
    if (i === 1) return normalizeDP(scenario.dp1);

    if (i === 2) {
      const raw = scenario.dp2;
      if (!raw) return { narrative: '', stem: '', options: [] };
      if (Array.isArray(raw) || Array.isArray(raw?.options)) return normalizeDP(raw);

      const prev1 = selections[1]?.optionId;
      if (prev1 && Array.isArray(raw[prev1])) {
        return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw[prev1] };
      }
      if (raw.default && Array.isArray(raw.default)) {
        return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw.default };
      }

      const combined: any[] = Object.values(raw).flat().filter((v: any) => Array.isArray(v)).flat();
      return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: combined };
    }

    if (i === 3) {
      const raw = scenario.dp3;
      if (!raw) return { narrative: '', stem: '', options: [] };
      if (Array.isArray(raw) || Array.isArray(raw?.options)) return normalizeDP(raw);

      const prev2 = selections[2]?.optionId;
      if (prev2 && Array.isArray(raw[prev2])) {
        return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw[prev2] };
      }
      if (raw.default && Array.isArray(raw.default)) {
        return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw.default };
      }

      const combined: any[] = Object.values(raw).flat().filter((v: any) => Array.isArray(v)).flat();
      return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: combined };
    }

    return { narrative: '', stem: '', options: [] };
  }

  // local-only: update selection sequence & change count when user clicks an option
  function onSelectOption(dpIndex: number, optionId: string) {
    // don't allow selecting a locked DP (earlier screens)
    if (dpIndex < screen) return;

    const now = Date.now();
    const timeOnPage = startTimes[dpIndex] ? now - startTimes[dpIndex] : 0;

    setSelectionSequences(prev => {
      const prevSeq = prev[dpIndex] ?? [];
      const last = prevSeq.length ? prevSeq[prevSeq.length - 1] : null;
      const newSeq = last === optionId ? prevSeq : [...prevSeq, optionId];
      // set first selection timestamp if this is the first selection
      if (!selectionFirstTimes[dpIndex] && newSeq.length === 1) {
        setSelectionFirstTimes(s => ({ ...s, [dpIndex]: Date.now() }));
      }
      // update change count
      setChangeCounts(cPrev => {
        const prevCount = cPrev[dpIndex] ?? 0;
        const increment = last === optionId ? 0 : 1;
        return { ...cPrev, [dpIndex]: prevCount + increment };
      });
      return { ...prev, [dpIndex]: newSeq };
    });

    setSelections(prev => ({
      ...prev,
      [dpIndex]: { optionId, confidence: prev[dpIndex]?.confidence ?? null, timeMs: timeOnPage }
    }));
  }

  function onConfidenceChange(dpIndex: number, val: number) {
    // val expected 1..5
    const now = Date.now();
    const timeOnPage = startTimes[dpIndex] ? now - startTimes[dpIndex] : 0;
    setSelections(prev => ({
      ...prev,
      [dpIndex]: { optionId: prev[dpIndex]?.optionId, confidence: val, timeMs: timeOnPage }
    }));
    setConfidenceChangeCounts(prev => ({ ...prev, [dpIndex]: (prev[dpIndex] ?? 0) + 1 }));
  }

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

  // Lock current DP via explicit server endpoint
  async function lockDecisionAndAdvance(currentScreen: number) {
    setError(null);

    const sel = selections[currentScreen];
    const seq = selectionSequences[currentScreen] ?? [];
    const count = changeCounts[currentScreen] ?? seq.length > 0 ? seq.length : 0;
    const conf = sel?.confidence ?? null;

    if (!sel?.optionId) {
      setError('Please select an option and set confidence before continuing.');
      return null;
    }
    if (conf === null || typeof conf === 'undefined') {
      // spec-standardized prompt - exact wording
      setError('Please rate your confidence before continuing.');
      return null;
    }

    // timestamps (optional)
    const ts = {
      first_selection: selectionFirstTimes[currentScreen] ?? null,
      final_selection: Date.now()
    };

    const payload: any = {
      session_hint: typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null,
      scenario_id: scenarioId,
      decision_point: currentScreen,
      final_option_id: sel.optionId,
      selection_sequence: seq,
      change_count: count,
      confidence: conf,
      confidence_change_count: confidenceChangeCounts[currentScreen] ?? 0,
      time_on_page_ms: sel.timeMs ?? 0,
      timestamps: ts
    };

    try {
      const res = await fetch('/api/decisions/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) {
        console.error('lock decision failed', json);
        setError(json?.error || 'Failed to lock decision');
        return null;
      }
      return json;
    } catch (e) {
      console.error('lock decision exception', e);
      setError('Server error locking decision');
      return null;
    }
  }

  async function goNext() {
    setError(null);

    if (screen === 1 || screen === 2) {
      // lock current DP (1 or 2)
      setSubmitting(true);
      const lockRes = await lockDecisionAndAdvance(screen);
      setSubmitting(false);
      if (!lockRes) return;

      // advance
      const next = screen + 1;
      setScreen(next);
      setStartTimes((prev: any) => ({ ...prev, [next]: Date.now() }));
      return;
    }

    // screen === 3 (final)
    if (screen === 3) {
      const sel = selections[3];
      if (!sel?.optionId) {
        setError('Please select an option and set confidence before continuing.');
        return;
      }
      if (sel?.confidence === null || typeof sel?.confidence === 'undefined') {
        setError('Please rate your confidence before continuing.');
        return;
      }
      const wordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 50) {
        setError('Reflection must be at least 50 words.');
        return;
      }

      setSubmitting(true);
      try {
        // Lock final DP
        const lockRes = await lockDecisionAndAdvance(3);
        if (!lockRes) {
          setSubmitting(false);
          return;
        }

        const session_hint = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;

        // Persist empty pre reflection if desired (backwards compat)
        try {
          await persistReflection(session_hint, scenarioId, 'pre', '');
        } catch (e) { /* ignore */ }

        // Compute debrief
        const res = await fetch('/api/compute-debrief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_hint,
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

          // persist reflection
          try {
            await persistReflection(session_hint, scenarioId, 'post', reflection);
          } catch (e) {
            console.debug('persist post reflection failed', e);
          }

          // persist metrics for dashboard - best-effort
          try {
            await fetch('/api/store-scenario-metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: session_hint, scenario_id: scenarioId, metrics: json })
            });
          } catch (e) {
            console.debug('store scenario metrics failed', e);
          }

          // Save debrief to localStorage for the full debrief page (create session id if missing)
          try {
            if (typeof window !== 'undefined') {
              let sid = localStorage.getItem('pyp_session_id');
              if (!sid) {
                const newSid = makeLocalSessionId();
                localStorage.setItem('pyp_session_id', newSid);
                sid = newSid;
              }
              if (sid) {
                localStorage.setItem(`pyp_debrief_${sid}_${scenarioId}`, JSON.stringify(json));
              } else {
                console.warn('No session id available to save debrief');
              }
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

  // Render
  return (
    <div className="space-y-6">
      <div className="bg-[#071017] border border-[#202933] rounded-xl p-6">
        <p className="text-xs text-slate-400 tracking-[0.24em] uppercase">Scenario</p>
        <h2 className="text-2xl font-semibold mt-2">{scenario.title}</h2>
        <div className="mt-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => {
              const dp = dpFor(i);
              const isCurrent = i === screen;
              const isLocked = i < screen;
              const selected = selections[i];
              return (
                <div
                  key={i}
                  className={`rounded-md p-4 border ${isCurrent ? 'border-sky-500 bg-[#071820]' : 'border-slate-700 bg-[#071016]'}`}
                >
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
                          onClick={() => {
                            if (!isLocked && isCurrent) onSelectOption(i, opt.id);
                          }}
                          className={`text-left w-full px-3 py-3 rounded-md border ${chosen ? 'border-sky-500 bg-sky-700/10' : 'border-slate-700'} hover:bg-slate-800 transition`}
                          aria-pressed={chosen}
                          aria-label={`DP${i} option ${opt.id}`}
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

                    <div className="mt-2 flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((v) => {
                        const pressed = selected?.confidence === v;
                        return (
                          <button
                            key={v}
                            onClick={() => { if (!isLocked && isCurrent) onConfidenceChange(i, v); }}
                            className={`px-3 py-1 rounded-md border ${pressed ? 'bg-sky-500 text-black' : 'bg-[#0a0f12] text-slate-200'} focus:outline-none`}
                            aria-pressed={pressed}
                            aria-label={`Confidence ${v} for DP ${i}`}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400">
                      <div>Set confidence before proceeding (1 = low, 5 = high).</div>
                    </div>
                  </div>

                  {!isCurrent && !isLocked && <div className="mt-2 text-xs text-slate-500">Not active</div>}
                </div>
              );
            })}
          </div>

          {error && <div className="mt-4 text-rose-400 text-sm">{error}</div>}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={goNext}
              disabled={submitting}
              className={`px-5 py-2 rounded-md font-semibold ${submitting ? 'bg-slate-600 cursor-wait' : 'bg-sky-500 text-black'}`}
            >
              {submitting ? 'Processing…' : (screen < 3 ? 'NEXT' : 'Submit')}
            </button>

            <button
              onClick={() => {
                // "Back to Coins" - preserve original behaviour
                if (typeof window !== 'undefined') window.location.href = '/coins';
              }}
              className="px-4 py-2 rounded-md border border-slate-700 text-sm text-slate-200"
            >
              Back to Coins
            </button>
          </div>
        </div>
      </div>

      {debrief && (
        <div>
          <DebriefPopup debrief={debrief} />
        </div>
      )}
    </div>
  );
}
