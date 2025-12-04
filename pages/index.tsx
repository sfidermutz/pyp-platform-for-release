import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="p-8">
      <div className="panel mb-6">
        <h1 className="h1 text-3xl">Pick Your Path — Strategic Edge</h1>
        <p className="muted small mt-2">Welcome. Use the Module dashboard to explore scenarios, run pilots and view debriefs. Beth's canonical SOT lives in <code>docs/MASTER_REQUIREMENTS.md</code>.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="panel">
          <h2 className="text-xl font-semibold">Quick Links</h2>
          <ul className="mt-3 space-y-2">
            <li><Link href="/modules/HYB-RED-01"><a className="text-accent">Hybrid Module Dashboard (HYB-RED-01)</a></Link></li>
            <li><Link href="/modules/HYB"><a className="text-accent">HYB (alias)</a></Link></li>
            <li><Link href="/docs/MASTER_REQUIREMENTS.md"><a className="text-accent">Master Requirements (SOT)</a></Link></li>
          </ul>
        </div>

        <div className="panel">
          <h2 className="text-xl font-semibold">Status</h2>
          <div className="mt-3 muted small">
            The system now exposes the Module Dashboard and Scenario pages. Use the Quick Links to open the HYB module. If pages look unsubtle, run the preview and navigate to the module path explicitly.
          </div>
        </div>
      </div>
    </div>
  );
}
