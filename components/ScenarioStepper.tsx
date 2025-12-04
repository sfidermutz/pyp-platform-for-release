import React, { useState } from 'react';

export default function ScenarioStepper({ scenario, onComplete }: any) {
  const [dpIndex, setDpIndex] = useState(1);
  const [choices, setChoices] = useState<{ [k:string]: any }>({});
  const [confidence, setConfidence] = useState(3);
  const [reflection1, setReflection1] = useState('');
  const [reflection2, setReflection2] = useState('');

  const dpKey = (i:number) => i === 1 ? 'dp1' : i === 2 ? 'dp2' : 'dp3';
  const getOptions = () => {
    if (dpIndex === 1) return scenario.dp1?.options || [];
    if (dpIndex === 2) {
      const sel1 = choices['dp1'];
      if (!sel1) return [];
      const branch = (scenario.dp2 || []).find((b:any) => String(b.branch).startsWith(String((sel1.id || sel1.option_id || '').slice(-1)).toUpperCase())) || scenario.dp2[0];
      return branch?.options || [];
    }
    if (dpIndex === 3) {
      const sel1 = choices['dp1'];
      const sel2 = choices['dp2'];
      if (!sel1 || !sel2) return [];
      const key = (sel1.id || sel1.option_id || 'A').slice(0,1).toUpperCase() + (sel2.id || sel2.option_id || 'A').slice(0,1).toUpperCase();
      const branch = (scenario.dp3 || []).find((b:any)=> String(b.branch).toUpperCase()===key) || scenario.dp3[0];
      return branch?.options || [];
    }
    return [];
  };

  function chooseOption(opt:any) {
    setChoices(prev => ({ ...prev, [`dp${dpIndex}`]: opt }));
  }

  function next() {
    if (dpIndex < 3) setDpIndex(dpIndex+1);
    else {
      const run = {
        decisions: [choices.dp1, choices.dp2, choices.dp3],
        confidence,
        reflection1,
        reflection2,
      };
      onComplete(run);
    }
  }

  const options = getOptions();
  return (
    <div className="panel">
      <div className="text-sm muted">DP{dpIndex}</div>
      <div className="mt-3 grid gap-3">
        {options.map((o:any)=>(
          <button key={o.id || o.option_id} onClick={()=>chooseOption(o)}
            className={`w-full text-left p-3 rounded ${choices[`dp${dpIndex}`]?.id === (o.id||o.option_id) ? 'bg-[#18304a]' : 'bg-[#0f1728]'}`}>
            <div className="font-semibold">{o.text}</div>
            <div className="text-xs muted mt-1">Tags: {(o.tags || o.bias_tags || []).join(', ')}</div>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="muted">Confidence</label>
        <div className="mt-2">
          <input type="range" min={1} max={5} value={confidence} onChange={(e)=>setConfidence(Number(e.target.value))} />
          <div className="text-sm muted">Value: {confidence}</div>
        </div>
      </div>

      {dpIndex === 3 && (
        <>
          <div className="mt-4">
            <label className="muted">Reflection 1 (min 50)</label>
            <textarea value={reflection1} onChange={(e)=>setReflection1(e.target.value)} className="w-full mt-2 p-2" rows={4}/>
          </div>
          <div className="mt-4">
            <label className="muted">Reflection 2 (post-debrief)</label>
            <textarea value={reflection2} onChange={(e)=>setReflection2(e.target.value)} className="w-full mt-2 p-2" rows={4}/>
          </div>
        </>
      )}

      <div className="mt-4 flex justify-end">
        <button onClick={next} className="px-4 py-2 bg-accent rounded text-black font-semibold">
          {dpIndex < 3 ? 'Next' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
