// components/ModuleCard.tsx
'use client';

import React from 'react';

type Family = { name?: string };
/**
 * Accept a permissive module shape — keep fields optional to be tolerant of varying DB schemas.
 * This prevents TypeScript incompatibilities when different files declare slightly different ModuleRecord shapes.
 */
export type ModuleRecord = {
  id: string;
  name: string;
  description?: string | null;
  image_path?: string | null;
  default_scenario_id?: string | null;
  module_code?: string | null;
  ects?: number | null;
  module_families?: Family[];
  // Extra fields that other files may include — keep optional for compatibility
  shelf_position?: number | null;
  is_demo?: boolean;
  // allow arbitrary additional metadata without breaking typing
  [key: string]: any;
};

export default function ModuleCard({ module, onOpen }: { module: ModuleRecord, onOpen: (m: ModuleRecord) => void }) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(module);
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
      <div style={{ width: 84, height: 84 }} className="relative">
        {module.image_path ? (
          <img
            src={module.image_path}
            alt={module.name ?? ''}
            className="tile-image"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/coins/placeholder.svg'; }}
          />
        ) : (
          <img src="/coins/placeholder.svg" alt="" className="tile-image" loading="lazy" />
        )}
      </div>

      <div className="module-tile-title" title={module.name}>
        {module.name}
      </div>

      <div className="module-tile-desc" title={module.description ?? ''}>
        {module.description ?? <span className="text-muted">No description</span>}
      </div>

      <div className="module-tile-meta" style={{ marginTop: 8 }}>
        <div className="module-badge">{module.module_code ?? '—'}</div>
        <div className="module-badge">Scenario: {module.default_scenario_id ?? 'TBD'}</div>
      </div>

      <div style={{ marginTop: 10, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {module.module_families && module.module_families.length > 0 && module.module_families.slice(0,2).map((f, i) => (
              <div key={i} className="module-badge" style={{ fontSize: 11, padding: '4px 6px' }}>{f.name}</div>
            ))}
            {typeof module.ects === 'number' ? (
              <div className="module-badge" style={{ fontSize: 11 }}>ECTS {module.ects}</div>
            ) : null}
          </div>

          <div>
            <button
              onClick={(e) => { e.stopPropagation(); onOpen(module); }}
              className="px-3 py-2 rounded-md bg-sky-500 text-black font-semibold"
              aria-label={`Start module ${module.name}`}
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
