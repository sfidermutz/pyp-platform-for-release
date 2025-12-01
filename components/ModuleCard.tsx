// components/ModuleCard.tsx
'use client';

import React from 'react';
import type { ModuleRecord } from '@/types/module';

/**
 * ModuleCard: compact module tile with PYP placeholder fallback.
 *
 * Uses shared ModuleRecord type from types/module.ts so types remain consistent across the app.
 */

const envVal = typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_FORCE_PYP_TOKEN : undefined;
const FORCE_PYP_TOKEN = envVal !== undefined ? (String(envVal).toLowerCase() === 'true') : true;
const PYP_PLACEHOLDER = '/coins/placeholder.svg';

export default function ModuleCard({ module, onOpen }: { module: ModuleRecord, onOpen: (m: ModuleRecord) => void }) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(module);
    }
  };

  const imageSrc = FORCE_PYP_TOKEN ? PYP_PLACEHOLDER : (module.image_path ? String(module.image_path) : PYP_PLACEHOLDER);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    try {
      const img = e.currentTarget;
      if (!img) return;
      if (img.src && img.src.endsWith(PYP_PLACEHOLDER)) return;
      img.src = PYP_PLACEHOLDER;
    } catch (err) {}
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open module ${module.name}`}
      onClick={() => onOpen(module)}
      onKeyDown={handleKey}
      className="coin-tile"
    >
      <div>
        <div style={{ width: 84, height: 84 }} className="relative mx-auto">
          <img
            src={imageSrc}
            alt={module.name ?? ''}
            className="tile-image"
            loading="lazy"
            onError={handleImgError}
          />
        </div>

        <div className="module-tile-title mt-3" title={String(module.name ?? '')}>
          {module.name}
        </div>

        <div className="module-tile-sub">
          {module.description ? String(module.description).slice(0, 64) : ''}
        </div>
      </div>

      <div className="coin-tile-footer">
        <div className="tile-footer-left" aria-hidden>
          {module.module_families && module.module_families.length > 0 && module.module_families.slice(0,2).map((f, i) => (
            <div key={i} className="module-badge" style={{ fontSize: 11, padding: '4px 6px' }}>{f.name}</div>
          ))}
          {typeof module.ects === 'number' ? (
            <div className="module-badge" style={{ fontSize: 11 }}>ECTS {module.ects}</div>
          ) : null}
        </div>

        <div className="tile-footer-right">
          <div className="module-badge" style={{ marginRight: 8 }}>{module.module_code ?? '—'}</div>
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(module); }}
            className="px-3 py-2 rounded-md bg-sky-500 text-black font-semibold"
            aria-label={`Start module ${module.name}`}
          >
            Start
          </button>
        </div>
      </div>
    </article>
  );
}
