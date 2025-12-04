import React from 'react';
import Link from 'next/link';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#071025] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <a className="flex items-center gap-3">
                <div style={{width:44, height:44, background:'#0f1728', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <span style={{color:'var(--silver)', fontFamily:'Orbitron', fontWeight:700}}>PYP</span>
                </div>
                <div>
                  <div className="h1 text-base">Pick Your Path</div>
                  <div className="muted small">Strategic Edge</div>
                </div>
              </a>
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            <Link href="/modules/HYB-RED-01"><a className="text-sm muted hover:text-white">Hybrid Module</a></Link>
            <Link href="/modules/HYB"><a className="text-sm muted hover:text-white">HYB (alias)</a></Link>
            <Link href="/docs/MASTER_REQUIREMENTS.md"><a className="text-sm muted hover:text-white">SOT</a></Link>
            <a href="/06_CHANGELOG/CHANGELOG.md" className="text-sm muted hover:text-white">CHANGELOG</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-gray-800 bg-[#071025] text-muted small py-4">
        <div className="max-w-7xl mx-auto px-4 flex justify-between">
          <div>Pick Your Path — Strategic Edge</div>
          <div>© {new Date().getFullYear()} PYP</div>
        </div>
      </footer>
    </div>
  );
}
