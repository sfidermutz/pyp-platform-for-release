// components/ScenarioEngine.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import DebriefPopup from './DebriefPopup';

/**
 * ScenarioEngine (slim)
 *
 * UX rules:
 * - Next / Lock buttons inside each DP card
 * - Confidence defaults to null (unset), required before locking
 * - Next disabled until both option and confidence chosen
 * - No auto-advance: arrow keys move focus/selection, Enter/Space selects only
 * - DP3 lock scrolls/focuses reflection; reflection requires 50 words
 *
 * Telemetry & server calls (kept minimal):
 * - /api/decisions/lock for locked decisions
 * - /api/compute-debrief for final scoring
 * - /api/store-scenario-metrics best-effort after compute
 */

function makeLocalSessionId() {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return 's_' + Math.random().toString(36).slice(2, 10);
}

type Selection = { optionId?: string; confidence?: number | null; timeMs?: number };

export default function ScenarioEngine({ scenario, scenarioId }: { scenario: any; scenarioId: string }) {
  const [screen, setScreen] = useState<number>(1);
  const [selections, setSelections] = useState<Record<number, Selection>>({});
  const [selectionSequences, setSelectionSequences] = useState<Record<number, string[]>>({});
  const [changeCounts, setChangeCounts] = useState<Record<number, number>>({});
  const [selectionFirstTimes, setSelectionFirstTimes] = useState<Record<number, number | null>>({});
  const [startTimes, setStartTimes] = useState<Record<number, number>>({});
  const [confidenceChangeCounts, setConfidenceChangeCounts] = useState<Record<number, number>>({});
  const [reflection, setReflection] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dp3Locked, setDp3Locked] = useState(false);

  const optionGroupRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const reflectionRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const existing = localStorage.getItem('pyp_session_id');
        if (!existing) {
          const newSid = makeLocalSessionId();
          localStorage.setItem('pyp_session_id', newSid);
        }
      } catch (e) {}
    }
    setStartTimes((prev: any) => ({ ...prev, [1]: Date.now() }));
  }, []);

  function normalizeDP(dpRaw: any): { narrative?: string; stem?: string; options: any[] } {
    if (!dpRaw) return { narrative: '', stem: '', options: [] };
    if (Array.isArray(dpRaw?.options)) return dpRaw;
    if (Array.isArray(dpRaw)) return { narrative: '', stem: '', options: dpRaw };
    return { narrative: dpRaw.narrative ?? '', stem: dpRaw.stem ?? '', options: [] };
  }

  function dpFor(i: number) {
    if (i === 1) return normalizeDP(scenario?.dp1);
    if (i === 2) {
      const raw = scenario?.dp2;
      if (!raw) return { narrative: '', stem: '', options: [] };
      if (Array.isArray(raw) || Array.isArray(raw?.options)) return normalizeDP(raw);
      const prev1 = selections[1]?.optionId;
      if (prev1 && Array.isArray(raw[prev1])) return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw[prev1] };
      if (raw.default && Array.isArray(raw.default)) return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw.default };
      const combined: any[] = Object.values(raw).flat().filter((v: any) => Array.isArray(v)).flat();
      return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: combined };
    }
    if (i === 3) {
      const raw = scenario?.dp3;
      if (!raw) return { narrative: '', stem: '', options: [] };
      if (Array.isArray(raw) || Array.isArray(raw?.options)) return normalizeDP(raw);
      const prev2 = selections[2]?.optionId;
      if (prev2 && Array.isArray(raw[prev2])) return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw[prev2] };
      if (raw.default && Array.isArray(raw.default)) return { narrative: raw.narrative ?? '', stem: raw.stem ?? '', options: raw.default };
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

  function handleOptionKeyDown(e: React.KeyboardEvent, dpIndex: number, optionIndex: number, optionsLength: number) {
    const key = e.key;
    const group = optionGroupRefs.current[dpIndex];
    if (!group) return;
    const btns = Array.from(group.querySelectorAll<HTMLButtonElement>('.option-btn'));
    if (!btns || btns.length === 0) return;

    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      const target = btns[optionIndex];
      if (target) {
        const id = target.getAttribute('data-option-id') || undefined;
        if (id) onSelectOption(dpIndex, id);
      }
      return;
    }

    if (key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'ArrowRight' && key !== 'ArrowDown') return;
    e.preventDefault();

    let nextIndex = optionIndex;
    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex = (optionIndex - 1 + optionsLength) % optionsLength;
    } else {
      nextIndex = (optionIndex + 1) % optionsLength;
    }

    const target = btns[nextIndex];
    if (target) {
      target.focus();
      const id = target.getAttribute('data-option-id') || undefined;
      if (id) onSelectOption(dpIndex, id);
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

  async function lockDP3AndGoToReflection() {
    setError(null);
    setSubmitting(true);
    const lockRes = await lockDecisionAndAdvance(3);
    setSubmitting(false);
    if (!lockRes) return;
    setDp3Locked(true);
    try {
      setScreen(3);
      if (reflectionRef.current) {
        reflectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        reflectionRef.current.focus();
      } else {
        const el = document.getElementById('reflection-textarea');
        if (el) {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLTextAreaElement).focus();
        }
      }
    } catch (e) {}
  }

  function toIntish(v: any): number {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.round(n);
    return 0;
  }

  async function handleSubmitFinal() {
    setError(null);

    if (!dp3Locked) {
      setSubmitting(true);
      const lr = await lockDecisionAndAdvance(3);
      setSubmitting(false);
      if (!lr) return;
      setDp3Locked(true);
    }

    const wordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      setError('Reflection must be at least 50 words.');
      try {
        if (reflectionRef.current) {
          reflectionRef.current.focus();
          reflectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (e) {}
      return;
    }

    setSubmitting(true);
    try {
      const selPayload: any = {};
      for (const i of [1, 2, 3]) {
        const s = selections[i];
        if (s && s.optionId) {
          selPayload[i] = { optionId: s.optionId, confidence: s.confidence ?? null };
        }
      }

      const session_hint = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;
      const payload = {
        session_hint,
        scenario_id: scenarioId,
        selections: selPayload,
        reflection
      };

      const resp = await fetch('/api/compute-debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await resp.json();
      if (!resp.ok) {
        console.error('compute-debrief failed', json);
        setError(json?.error || 'Failed to compute debrief');
        setSubmitting(false);
        return;
      }

      try {
        if (json) {
          const metrics = json;
          await fetch('/api/store-scenario-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: session_hint,
              scenario_id: scenarioId,
              metrics,
              meta: { selections: selPayload, reflection_summary: reflection ? `${reflection.slice(0, 140)}...` : '' },
              computed_at: new Date().toISOString()
            })
          });
        }
      } catch (e) {}

      setDebrief(json ?? null);
    } catch (e) {
      console.error('submit final exception', e);
      setError('Server error during submit');
    } finally {
      setSubmitting(false);
    }
  }

  function optId(o: any) {
    return String(o?.id ?? o?.option_id ?? o?.optionId ?? (o?.id ?? JSON.stringify(o)));
  }
  function optText(o: any) {
    return o?.text ?? o?.label ?? o?.title ?? o?.name ?? '';
  }

  function DPCard({ dpIndex }: { dpIndex: number }) {
    const dp = dpFor(dpIndex);
    const opts = dp?.options ?? [];
    const sel = selections[dpIndex] ?? {};
    const selectedId = sel?.optionId ?? null;
    const confidenceVal = sel?.confidence ?? null;

    return (
      <div className="scenario-card" role="region" aria-labelledby={`dp-${dpIndex}-label`}>
        <div className="flex items-start justify-between">
          <div>
            <div id={`dp-${dpIndex}-label`} className="text-xs text-slate-400 uppercase tracking-wider">Decision Point {dpIndex}</div>
            <h3 className="text-lg font-semibold mt-1">{dp?.stem ?? dp?.narrative ?? (dpIndex === 1 ? 'Initial decision' : `Decision ${dpIndex}`)}</h3>
          </div>
          <div className="text-xs text-slate-400">CEFR B2</div>
        </div>

        {dp?.narrative && <div className="mt-3 text-sm text-slate-300">{dp.narrative}</div>}

        <div
          className="mt-4"
          ref={(el) => { optionGroupRefs.current[dpIndex] = el; }}
          role="radiogroup"
          aria-labelledby={`dp-${dpIndex}-label`}
        >
          {opts.length === 0 && <div className="text-sm text-slate-400">No options defined for this decision in the scenario JSON.</div>}

          {opts.map((o: any, idx: number) => {
            const id = optId(o);
            const checked = selectedId === id;
            return (
              <div key={id} className="flex items-start gap-3 bg-[#0b1114] border border-slate-800 rounded-md p-3 mt-3">
                <button
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  data-option-id={id}
                  tabIndex={0}
                  className="option-btn w-full text-left"
                  onClick={() => onSelectOption(dpIndex, id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectOption(dpIndex, id);
                      return;
                    }
                    handleOptionKeyDown(e, dpIndex, idx, opts.length);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${checked ? 'bg-sky-500' : 'border border-slate-700'} flex-shrink-0`} aria-hidden />
                    <div className="text-sm text-slate-200">{optText(o)}</div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 border rounded-md bg-[#07181b]">
          <div className="text-sm text-slate-300">Confidence (select a value)</div>
          <div className="mt-2 flex items-center gap-4">
            <div role="radiogroup" aria-label={`Confidence for DP${dpIndex}`} className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => {
                const active = confidenceVal === v;
                return (
                  <button
                    key={v}
                    aria-pressed={active}
                    onClick={() => onConfidenceChange(dpIndex, v)}
                    className={`px-3 py-1 rounded ${active ? 'bg-sky-500 text-black' : 'bg-slate-700 text-slate-200'}`}
                    title={`${v} / 5`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto text-sm text-slate-200">
              {confidenceVal === null ? '—' : `${confidenceVal}/5`}
            </div>
          </div>

          <div className="mt-2 text-xs text-slate-400">Choose how confident you are (required).</div>

          <div className="mt-4">
            {dpIndex < 3 ? (
              <button
                type="button"
                onClick={() => handleNextForDP(dpIndex)}
                disabled={!selectedId || confidenceVal === null || submitting}
                className={`px-4 py-2 rounded-md font-semibold ${(!selectedId || confidenceVal === null || submitting) ? 'bg-slate-600 cursor-not-allowed' : 'bg-sky-500 text-black'}`}
                aria-disabled={!selectedId || confidenceVal === null || submitting}
              >
                {submitting ? 'Processing…' : 'Next'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => lockDP3AndGoToReflection()}
                disabled={!selectedId || confidenceVal === null || submitting}
                className={`px-4 py-2 rounded-md font-semibold ${(!selectedId || confidenceVal === null || submitting) ? 'bg-slate-600 cursor-not-allowed' : 'bg-amber-500 text-black'}`}
                aria-disabled={!selectedId || confidenceVal === null || submitting}
              >
                {submitting ? 'Locking…' : 'Lock & Continue to Reflection'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-[#071017] border border-[#202933] rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400 tracking-[0.24em] uppercase">Scenario</p>
              <h1 className="text-2xl font-semibold mt-2">{scenario?.title ?? scenario?.scenario_id ?? 'Untitled Scenario'}</h1>
              <div className="mt-2 text-sm text-slate-300">
                {scenario?.role ? <span className="mr-3"><strong>Role:</strong> {scenario.role}</span> : null}
                {scenario?.year ? <span className="mr-3"><strong>Year:</strong> {scenario.year}</span> : null}
              </div>

              {scenario?.scenario_lo ? (
                <div className="mt-4 p-3 rounded-md bg-[#071820] border border-slate-700">
                  <div className="text-sm text-slate-300 font-medium">Learning Outcome</div>
                  <div className="mt-1 text-sm text-sky-300">{scenario.scenario_lo}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <DPCard dpIndex={1} />

        <div style={{ display: screen >= 2 ? 'block' : 'none' }}>
          <DPCard dpIndex={2} />
        </div>

        <div style={{ display: screen >= 3 ? 'block' : 'none' }}>
          <DPCard dpIndex={3} />

          <div className="scenario-card" id="reflection-block" aria-live="polite">
            <div className="text-sm text-slate-300">Reflection</div>
            <div className="mt-3">
              <textarea
                id="reflection-textarea"
                ref={reflectionRef}
                rows={6}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full rounded-md bg-[#07181b] border border-slate-800 p-3 text-sm text-slate-200"
                placeholder="Reflect on your decisions — minimum 50 words."
                aria-required={true}
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => handleSubmitFinal()}
                disabled={submitting}
                className={`px-4 py-2 rounded-md font-semibold ${submitting ? 'bg-slate-600' : 'bg-sky-500 text-black'}`}
              >
                {submitting ? 'Submitting…' : 'Submit & Debrief'}
              </button>
              <div className="text-xs text-slate-400 ml-3">Minimum 50 words required.</div>
            </div>

            {error ? <div className="mt-3 text-rose-400 text-sm">{error}</div> : null}
          </div>
        </div>

        {debrief ? (
          <DebriefPopup debrief={debrief} onClose={() => setDebrief(null)} />
        ) : null}
      </div>
    </main>
  );
}
