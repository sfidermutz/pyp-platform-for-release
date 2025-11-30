// components/ScenarioEngine.tsx
'use client';
import React, { useState, useEffect } from 'react';
import DebriefPopup from './DebriefPopup';

/**
 * ScenarioEngine (with focus management)
 *
 * - NEXT/Submit remain inside each DP box (no page-end controls).
 * - When screen (current DP) changes we focus the first interactive element inside the DP:
 *   first option button, then confidence buttons, then NEXT.
 * - Option buttons have class "option-btn" and are tabbable.
 */

function makeLocalSessionId() {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return 's_' + Math.random().toString(36).slice(2, 10);
}

export default function ScenarioEngine({ scenario, scenarioId }: { scenario: any; scenarioId: string }) {
  const [screen, setScreen] = useState<number>(1);
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
    setStartTimes((prev: any) => ({ ...prev, [1]: Date.now() }));
  }, []);

  // Focus management: when screen changes, focus first interactive element within that DP
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Delay slightly to allow DOM render
    const t = setTimeout(() => {
      try {
        const container = document.querySelector(`[data-dp="${screen}"]`);
        if (!container) return;
        const firstOption = container.querySelector<HTMLButtonElement>('.option-btn');
        if (firstOption) {
          firstOption.focus();
          return;
        }
        const firstConfidence = container.querySelector<HTMLButtonElement>('[aria-label^="Confidence"]');
        if (firstConfidence) {
          firstConfidence.focus();
          return;
        }
        const nextBtn = container.querySelector<HTMLButtonElement>(`[aria-label^="Next"], [aria-label="Submit final reflection and view debrief"]`);
        if (nextBtn) {
          nextBtn.focus();
        }
      } catch (e) {
        // no-op
      }
    }, 80);
    return () => clearTimeout(t);
  }, [screen]);

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

  function onSelectOption(dpIndex: number, optionId: string) {
    if (dpIndex < screen) return;

    const now = Date.now();
    const timeOnPage = startTimes[dpIndex] ? now - startTimes[dpIndex] : 0;

    setSelectionSequences(prev => {
      const prevSeq = prev[dpIndex] ?? [];
      const last = prevSeq.length ? prevSeq[prevSeq.length - 1] : null;
      const newSeq = last === optionId ? prevSeq : [...prevSeq, optionId];
      if (!selectionFirstTimes[dpIndex] && newSeq.length === 1) {
        setSelectionFirstTimes(s => ({ ...s, [dpIndex]: Date.now() }));
      }
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

  async function lockDecisionAndAdvance(currentScreen: number) {
    setError(null);

    const sel = selections[currentScreen];
    const seq = selectionSequences[currentScreen] ?? [];
    const count = changeCounts[currentScreen] ?? (seq.length > 0 ? seq.length : 0);
    const conf = sel?.confidence ?? null;

    if (!sel?.optionId) {
      setError('Please select an option and set confidence before continuing.');
      return null;
    }
    if (conf === null || typeof conf === 'undefined') {
      setError('Please rate your confidence before continuing.');
      return null;
    }

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

  async function handleNextForDP(dpIndex: number) {
    setError(null);
    setSubmitting(true);
    const lockRes = await lockDecisionAndAdvance(dpIndex);
    setSubmitting(false);
    if (!lockRes) return;
    if (dpIndex < 3) {
      const next = dpIndex + 1;
      setScreen(next);
      setStartTimes((prev: any) => ({ ...prev, [next]: Date.now() }));
    }
  }

  async function handleSubmitFinal() {
    setError(null);
    setSubmitting(true);
    const lockRes = await lockDecisionAndAdvance(3);
    if (!lockRes) { setSubmitting(false); return; }

    const wordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      setError('Reflection must be at least 50 words.');
      setSubmitting(false);
      return;
    }

    try {
      const session_hint = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;

      try {
        await persistReflection(session_hint, scenarioId, 'pre', '');
      } catch (e) { /* ignore */ }

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
        try {
          await persistReflection(session_hint, scenarioId, 'post', reflection);
        } catch (e) {
          console.debug('persist post reflection failed', e);
        }
        try {
          await fetch('/api/store-scenario-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: session_hint, scenario_id: scenarioId, metrics: json })
          });
        } catch (e) {
          console.debug('store scenario metrics failed', e);
        }
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
                  data-dp={i}
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
                          className={`option-btn text-left w-full px-3 py-3 rounded-md border ${chosen ? 'border-sky-500 bg-sky-700/10' : 'border-slate-700'} hover:bg-slate-800 transition`}
                          aria-pressed={chosen}
                          aria-label={`DP${i} option ${opt.id}`}
                          tabIndex={0}
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
                            tabIndex={0}
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

                  {isCurrent && !isLocked && (
                    <div className="mt-4 flex items-center gap-3">
                      {i < 3 ? (
                        <button
                          onClick={() => handleNextForDP(i)}
                          disabled={submitting || !selections[i]?.optionId || (selections[i]?.confidence === null || typeof selections[i]?.confidence === 'undefined')}
                          aria-disabled={submitting || !selections[i]?.optionId || (selections[i]?.confidence === null || typeof selections[i]?.confidence === 'undefined')}
                          className={`px-4 py-2 rounded-md font-semibold ${submitting ? 'bg-slate-600 cursor-wait' : 'bg-sky-500 text-black'}`}
                          aria-label={`Next for DP ${i}`}
                        >
                          {submitting ? 'Processing…' : 'NEXT'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleSubmitFinal}
                            disabled={submitting || !selections[3]?.optionId || (selections[3]?.confidence === null || typeof selections[3]?.confidence === 'undefined') || (reflection.trim().split(/\s+/).filter(Boolean).length < 50)}
                            aria-disabled={submitting || !selections[3]?.optionId || (selections[3]?.confidence === null || typeof selections[3]?.confidence === 'undefined') || (reflection.trim().split(/\s+/).filter(Boolean).length < 50)}
                            className={`px-4 py-2 rounded-md font-semibold ${submitting ? 'bg-slate-600 cursor-wait' : 'bg-green-500 text-black'}`}
                            aria-label="Submit final reflection and view debrief"
                          >
                            {submitting ? 'Submitting…' : 'Submit & Debrief'}
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => { if (typeof window !== 'undefined') window.location.href = '/coins'; }}
                        className="px-3 py-2 rounded-md border border-slate-700 text-sm text-slate-200"
                        aria-label="Back to Coins"
                      >
                        Back to Coins
                      </button>
                    </div>
                  )}

                  {!isCurrent && !isLocked && <div className="mt-2 text-xs text-slate-500">Not active</div>}
                </div>
              );
            })}
          </div>

          {error && <div className="mt-4 text-rose-400 text-sm">{error}</div>}

          {screen === 3 && (
            <div className="mt-6 bg-[#071017] border border-[#202933] rounded-md p-4">
              <h3 className="text-sm font-semibold">Reflection</h3>
              <p className="mt-2 text-xs text-slate-400">Write a reflection of at least 50 words explaining your reasoning and any biases you noticed.</p>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={6}
                className="mt-3 w-full bg-[#061017] border border-slate-800 rounded p-3 text-sm text-slate-200 focus:outline-none"
                aria-label="Reflection text"
                placeholder="Write your reflection here..."
              />
              <div className="mt-2 text-xs text-slate-400">
                Word count: {reflection.trim().split(/\s+/).filter(Boolean).length} (minimum 50)
              </div>
            </div>
          )}
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
