// components/ModuleCard.tsx
'use client';

import React from 'react';

type Family = { name?: string };

/**
 * Permissive ModuleRecord used by ModuleCard.
 * Note: fields are optional and allow `undefined` to remain compatible with other module shapes.
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
      {/* Top: logo / title / description - these occupy the top & middle */}
      <div>
        <div style={{ width: 84, height: 84 }} className="relative mx-auto">
          {module.image_path ? (
            <img
              src={String(module.image_path)}
              alt={module.name ?? ''}
              className="tile-image"
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/coins/placeholder.svg'; }}
            />
          ) : (
            <img src="/coins/placeholder.svg" alt="" className="tile-image" loading="lazy" />
          )}
        </div>

        <div className="module-tile-title" title={String(module.name ?? '')}>
          {module.name}
        </div>

        <div className="module-tile-desc" title={String(module.description ?? '')}>
          {module.description ?? <span className="text-muted">No description</span>}
        </div>
      </div>

      {/* Footer: badges and CTA - pinned to bottom by parent flex and justify-between */}
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
