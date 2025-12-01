// components/ModuleCard.tsx
'use client';

import React from 'react';

type Family = { name?: string };

/**
 * Compact ModuleRecord used by ModuleCard.
 * For now, force PYP fallback token for all coins while custom coins are unfinished.
 */
export type ModuleRecord = {
  id: string;
  name: string;
  description?: string | null | undefined;
  image_path?: string | null | undefined;
  default_scenario_id?: string | null | undefined;
  module_code?: string | null | undefined;
  ects?: number | null | undefined;
  module_families?: Family[] | undefined;
  shelf_position?: number | null | undefined;
  is_demo?: boolean | undefined;
  [key: string]: any;
};

// Force fallback to placeholder.svg in public/coins while final coin assets are not ready.
const FORCE_PYP_TOKEN = true;
const PYP_PLACEHOLDER = '/coins/placeholder.svg';

export default function ModuleCard({ module, onOpen }: { module: ModuleRecord, onOpen: (m: ModuleRecord) => void }) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(module);
    }
  };

  // Decide image to display
  const imageSrc = FORCE_PYP_TOKEN ? PYP_PLACEHOLDER : (module.image_path ? String(module.image_path) : PYP_PLACEHOLDER);

  // Guarded onError that avoids repeatedly setting the same src (no infinite loop/blink)
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    try {
      const img = e.currentTarget;
      if (!img) return;
      // if current src is already placeholder, do nothing
      if (img.src && img.src.endsWith(PYP_PLACEHOLDER)) return;
      img.src = PYP_PLACEHOLDER;
    } catch (err) {
      // swallow
    }
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
      {/* Top: icon + single title */}
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

        {/* Single authoritative title (no duplicates) */}
        <div className="module-tile-title mt-3" title={String(module.name ?? '')}>
          {module.name}
        </div>

        {/* Compact single-line subtitle for visual consistency */}
        <div className="module-tile-sub">
          {module.description ? String(module.description).slice(0, 64) : ''}
        </div>
      </div>

      {/* Footer: badges + CTA pinned to bottom (fixed footer height ensures CTA visible) */}
      <div className="coin-tile-footer">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {module.module_families && module.module_families.length > 0 && module.module_families.slice(0,2).map((f, i) => (
            <div key={i} className="module-badge" style={{ fontSize: 11, padding: '4px 6px' }}>{f.name}</div>
          ))}
          {typeof module.ects === 'number' ? (
            <div className="module-badge" style={{ fontSize: 11 }}>ECTS {module.ects}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
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
