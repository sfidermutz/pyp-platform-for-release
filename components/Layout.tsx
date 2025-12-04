// components/Layout.tsx
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    // Only run on client
    try {
      const sid = typeof window !== 'undefined' ? localStorage.getItem('pyp_session_id') : null;
      setIsAuthenticated(Boolean(sid));
    } catch (e) {
      // Defensive: if localStorage is blocked, treat as unauthenticated
      setIsAuthenticated(false);
    }
  }, []);

  function handleSignOut() {
    try {
      localStorage.removeItem('pyp_session_id');
      localStorage.removeItem('pyp_token');
      localStorage.removeItem('pyp_token_label');
    } catch (_) {}
    setIsAuthenticated(false);
    // Redirect back to landing (token gate)
    router.push('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#071025] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <a className="flex items-center gap-3">
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: '#0f1728',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ color: 'var(--silver)', fontFamily: 'Orbitron', fontWeight: 700 }}>
                    PYP
                  </span>
                </div>
                <div>
                  <div className="h1 text-base">Pick Your Path</div>
                  <div className="muted small">Strategic Edge</div>
                </div>
              </a>
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link href="/modules/HYB-RED-01">
                  <a className="text-sm muted hover:text-white">Hybrid Module</a>
                </Link>
                <Link href="/modules/HYB">
                  <a className="text-sm muted hover:text-white">HYB (alias)</a>
                </Link>
                <Link href="/docs/MASTER_REQUIREMENTS.md">
                  <a className="text-sm muted hover:text-white">SOT</a>
                </Link>
                <a href="/06_CHANGELOG/CHANGELOG.md" className="text-sm muted hover:text-white">
                  CHANGELOG
                </a>

                <button
                  onClick={handleSignOut}
                  className="text-sm muted hover:text-white bg-transparent border-none cursor-pointer"
                  aria-label="Sign out"
                >
                  Sign out
                </button>
              </>
            ) : (
              // Minimal links for unauthenticated users — keep it empty or add help
              <div className="text-sm muted">Demo: Token-gated access</div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8">{children}</main>

      <footer className="border-t border-gray-800 bg-[#071025] text-muted small py-4">
        <div className="max-w-7xl mx-auto px-4 flex justify-between">
          <div>Pick Your Path — Strategic Edge</div>
          <div>© {new Date().getFullYear()} PYP</div>
        </div>
      </footer>
    </div>
  );
}
