// types/module.ts
// Shared module & scenario types used across the app.

export type Family = {
  name?: string;
  code?: string;
};

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
  // allow arbitrary additional metadata without breaking typing
  [key: string]: any;
};

export type ScenarioMeta = {
  filename?: string;
  scenario_id?: string;
  title?: string;
  role?: string;
  learningOutcome?: string;
  narrative?: string;
  // ordering hints
  shelf_position?: number | null;
  scenario_order?: number | null;
  // allow arbitrary additional metadata without breaking typing
  [key: string]: any;
};
