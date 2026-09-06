import type { GoldenDataset, GoldenExtraction, GoldenValue } from '../dataset';
import type { RescueSheetV1, Evidence } from './schema';
import { isPlainObject } from './adapters/types';

/**
 * Project a rich v1.1 canonical record into the flat `path -> GoldenValue` map
 * that scoring / metrics / GT UI consume.
 *
 * Policy: procedure-level and inventory-level paths (~30–50), not every leaf.
 * Arrays preserve document order. Evaluation uses sequence mode for
 * ordered_steps and set mode for inventories/warnings by default.
 *
 * Exact-as-extraction policy: prefer document-supported `source_text` over
 * internal action/class IDs whenever both exist. IDs remain in the rich
 * canonical record for structure; they are not the default scorer target.
 */

export interface ProjectedField {
  value: GoldenValue;
}

export type Projection = Record<string, ProjectedField>;

function pushScalar(out: Projection, path: string, v: string | number | boolean | null | undefined): void {
  if (v === null || v === undefined || v === '') return;
  out[path] = { value: String(v) };
}

function pushArray(out: Projection, path: string, v: string[] | null | undefined): void {
  if (v === null || v === undefined) return;
  out[path] = { value: v };
}

/** LlamaExtract / VLM payloads sometimes wrap a scalar as `{ value, citation? }`. */
function asTrimmedString(v: unknown): string | null {
  if (typeof v === 'string') {
    const t = v.trim();
    return t ? t : null;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (
    isPlainObject(v) &&
    'value' in v &&
    !('source_text' in v) &&
    !('action' in v) &&
    !('step_number' in v)
  ) {
    return asTrimmedString(v.value);
  }
  return null;
}

function asList(v: unknown): unknown[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.trim() ? [v] : [];
  if (isPlainObject(v)) return [v];
  return [];
}

function pickText(item: unknown, keys: string[]): string | null {
  const direct = asTrimmedString(item);
  if (direct) return direct;
  if (!isPlainObject(item)) return null;
  for (const key of keys) {
    const t = asTrimmedString(item[key]);
    if (t) return t;
  }
  return null;
}

function stringList(v: unknown): string[] | undefined {
  const items = asList(v)
    .map((item) => pickText(item, ['source_text', 'text', 'description']))
    .filter((x): x is string => Boolean(x));
  return items.length ? items : undefined;
}

/**
 * Project ordered procedure steps for scoring.
 * Prefer sheet wording (`source_text`); fall back to `action` only when text is absent.
 * Also accepts string items and `{ text | description | value }` shapes from extractors.
 */
function stepActions(steps: unknown): string[] | undefined {
  const list = asList(steps);
  if (list.length === 0) return undefined;
  const items = list
    .map((s) =>
      pickText(s, ['source_text', 'text', 'description', 'content', 'instruction', 'step', 'action'])
    )
    .filter((x): x is string => Boolean(x));
  return items.length ? items : undefined;
}

/**
 * Battery / energy-system labels for Exact scoring.
 * Prefer sheet label (`source_text`, e.g. "800V Li-Ion"); fall back to a light composite only if text is absent.
 */
function energySystemSummaries(systems: unknown): string[] | undefined {
  const list = asList(systems);
  if (list.length === 0) return undefined;
  return list.map((s) => {
    const text = pickText(s, ['source_text', 'text', 'label']);
    if (text) return text;
    if (!isPlainObject(s)) return 'unknown';
    const parts: string[] = [];
    if (s.nominal_voltage_v != null) parts.push(`${s.nominal_voltage_v}V`);
    if (s.chemistry) parts.push(String(s.chemistry));
    if (s.component_type) parts.push(String(s.component_type));
    if (s.component_class) parts.push(String(s.component_class));
    if (s.energy_type) parts.push(String(s.energy_type));
    return parts.join(' ') || 'unknown';
  });
}

function storedItemSummaries(items: unknown): string[] | undefined {
  const list = asList(items);
  if (list.length === 0) return undefined;
  return list.map((it) => {
    const text = pickText(it, ['source_text', 'text', 'label', 'description']);
    if (text) return text;
    if (!isPlainObject(it)) return 'item';
    const parts: string[] = [];
    if (it.component_class) parts.push(String(it.component_class));
    if (it.cable_type) parts.push(String(it.cable_type));
    if (it.fluid_type) parts.push(String(it.fluid_type));
    if (it.nominal_voltage_v != null) parts.push(`${it.nominal_voltage_v}V`);
    if (it.chemistry) parts.push(String(it.chemistry));
    if (it.insulation_color) parts.push(String(it.insulation_color));
    if (it.action) parts.push(String(it.action));
    if (Array.isArray(it.color)) parts.push(it.color.map(String).join('/'));
    else if (it.color) parts.push(String(it.color));
    return parts.join(' ') || 'item';
  });
}

function monitoringSummaries(items: unknown): string[] | undefined {
  const list = asList(items);
  if (list.length === 0) return undefined;
  return list.map((m) => {
    const text = pickText(m, ['source_text', 'text']);
    if (text) return text;
    if (!isPlainObject(m)) return 'monitoring';
    const description = asTrimmedString(m.description);
    const parameter = asTrimmedString(m.parameter);
    const hours = typeof m.minimum_duration_hours === 'number' ? m.minimum_duration_hours : null;
    if (description) return hours != null ? `${description} (${hours}h)` : description;
    if (parameter) return hours != null ? `${parameter} (${hours}h)` : parameter;
    return 'monitoring';
  });
}

function actionOrTextList(items: unknown): string[] | undefined {
  const list = asList(items);
  if (list.length === 0) return undefined;
  return list
    .map((it) => pickText(it, ['source_text', 'text', 'description', 'content', 'action']) || 'item')
    .filter(Boolean);
}

function warningSummaries(warnings: unknown): string[] | undefined {
  const list = asList(warnings);
  if (list.length === 0) return undefined;
  return list.map(
    (w) => pickText(w, ['source_text', 'text', 'warning_id', 'hazard_type']) || 'warning'
  );
}

function accessMethodSummaries(methods: unknown): string[] | undefined {
  const list = asList(methods);
  if (list.length === 0) return undefined;
  return list.map((m) => {
    const text = pickText(m, ['source_text', 'text', 'action']);
    if (text) return text;
    if (!isPlainObject(m)) return 'access';
    const parts = [m.access_target, m.access_direction, m.power_state]
      .map(asTrimmedString)
      .filter((x): x is string => Boolean(x));
    return parts.join(' / ') || 'access';
  });
}

/**
 * Stabilization / lift legend rows.
 * Prefer source_text; else "color meaning" (space, not colon) so Exact can include color tokens.
 */
function zoneSummaries(zones: unknown): string[] | undefined {
  const list = asList(zones);
  if (list.length === 0) return undefined;
  return list.map((z) => {
    const text = pickText(z, ['source_text', 'text', 'label']);
    if (text) return text;
    if (!isPlainObject(z)) return 'zone';
    const color = asTrimmedString(z.color_code);
    const meaning = asTrimmedString(z.meaning);
    if (color && meaning) return `${color} ${meaning}`.trim();
    if (meaning) return meaning;
    return asTrimmedString(z.component_class) || color || 'zone';
  });
}

export function project(record: RescueSheetV1): Projection {
  const out: Projection = {};
  const v = record.vehicle;
  const p = v?.propulsion;
  const ri = record.responder_information ?? {};

  // Vehicle identity (scored only when present; primary_energy_source is inferred → not Exact)
  pushScalar(out, 'vehicle.manufacturer', v?.manufacturer);
  pushScalar(out, 'vehicle.model', v?.model);
  pushScalar(out, 'vehicle.model_year', v?.model_year);
  pushScalar(out, 'vehicle.model_year_start', v?.model_year_start);
  pushScalar(out, 'vehicle.body_style', v?.body_style);
  pushScalar(out, 'vehicle.door_count', v?.door_count ?? p?.door_count);
  pushScalar(out, 'vehicle.seating_capacity', v?.seating_capacity);
  // primary_energy_source intentionally not projected: not printed on Cybertruck sheet.
  pushScalar(out, 'vehicle.propulsion.drivetrain', p?.drivetrain ?? undefined);
  // Sheet labels (e.g. "800V Li-Ion") — path renamed from *_systems for Exact clarity.
  pushArray(out, 'vehicle.propulsion.high_voltage_battery', energySystemSummaries(p?.high_voltage_systems));
  pushArray(out, 'vehicle.propulsion.low_voltage_battery', energySystemSummaries(p?.low_voltage_systems));

  // Immobilization
  pushArray(
    out,
    'responder_information.immobilization.ordered_steps',
    stepActions(ri.immobilization?.ordered_steps)
  );

  // Stabilization / lifting
  const stab = ri.stabilization_lifting;
  if (stab) {
    pushArray(out, 'responder_information.stabilization_lifting.lift_areas', zoneSummaries(stab.lift_areas));
    pushArray(
      out,
      'responder_information.stabilization_lifting.stabilization_points',
      zoneSummaries(stab.stabilization_points)
    );
    pushArray(
      out,
      'responder_information.stabilization_lifting.no_contact_zones',
      zoneSummaries(stab.no_contact_zones)
    );
  }

  // Disable direct hazards
  const disable = ri.disable_direct_hazards;
  if (disable) {
    pushArray(
      out,
      'responder_information.disable_direct_hazards.ordered_steps',
      stepActions(disable.ordered_steps)
    );
    const frlText = pickText(disable.first_responder_loop, ['source_text', 'text', 'action']);
    if (frlText) {
      pushScalar(out, 'responder_information.disable_direct_hazards.first_responder_loop', frlText);
    }
  }

  // Occupant access
  const access = ri.occupant_access;
  if (access) {
    pushArray(
      out,
      'responder_information.occupant_access.access_methods',
      accessMethodSummaries(access.access_methods)
    );
    pushArray(
      out,
      'responder_information.occupant_access.extrication_constraints',
      actionOrTextList(access.extrication_constraints)
    );
  }
  // Legacy v1.0 free-form access
  pushArray(out, 'responder_information.access', stringList(ri.access));

  // Stored energy / fluids
  const stored = ri.stored_energy_fluids_gases_solids;
  if (stored) {
    pushArray(
      out,
      'responder_information.stored_energy_fluids_gases_solids.energy_sources',
      storedItemSummaries(stored.energy_sources)
    );
    pushArray(
      out,
      'responder_information.stored_energy_fluids_gases_solids.high_voltage_cables',
      storedItemSummaries(stored.high_voltage_cables)
    );
    pushArray(
      out,
      'responder_information.stored_energy_fluids_gases_solids.fluids',
      storedItemSummaries(stored.fluids)
    );
    // pyrotechnic_devices: diagram-only deduction for Cybertruck v1 → not Exact-projected.
    pushArray(
      out,
      'responder_information.stored_energy_fluids_gases_solids.prohibited_actions',
      actionOrTextList(stored.prohibited_actions)
    );
  }

  // Fire (prefer nested under responder_information; fall back to top-level v1.0)
  const fire = ri.fire ?? record.fire;
  if (fire) {
    pushArray(
      out,
      'responder_information.fire.prohibitions',
      actionOrTextList(fire.prohibitions)
    );
    {
      const suppression = asList(fire.suppression_cooling_actions)
        .map((a) => {
          const text = pickText(a, ['source_text', 'text', 'description']);
          if (text) return text;
          if (!isPlainObject(a)) return null;
          const parts = [a.action, a.target, a.application_direction]
            .map(asTrimmedString)
            .filter((x): x is string => Boolean(x));
          return parts.join(' ') || null;
        })
        .filter((s): s is string => Boolean(s));
      pushArray(out, 'responder_information.fire.suppression_cooling_actions', suppression);
    }
    pushArray(
      out,
      'responder_information.fire.monitoring_requirements',
      monitoringSummaries(fire.monitoring_requirements)
    );
    if (fire.reignition_risk != null) {
      const riskText = pickText(fire.reignition_risk, ['source_text', 'text']);
      if (riskText) {
        pushScalar(out, 'responder_information.fire.reignition_risk', riskText);
      } else if (isPlainObject(fire.reignition_risk) && fire.reignition_risk.risk_present != null) {
        pushScalar(
          out,
          'responder_information.fire.reignition_risk',
          fire.reignition_risk.risk_present ? 'true' : 'false'
        );
      }
    }
    pushArray(out, 'responder_information.fire.extinguishing_agents', stringList(fire.extinguishing_agents));
  }

  // Submersion
  const sub = ri.submersion ?? record.submersion;
  if (sub) {
    pushArray(out, 'responder_information.submersion.ordered_steps', stepActions(sub.ordered_steps));
    pushArray(out, 'responder_information.submersion.guidance', stringList(sub.guidance));
    const hazardNote = asTrimmedString(sub.hazard_note);
    if (hazardNote) pushScalar(out, 'responder_information.submersion.hazard_note', hazardNote);
    const drain = sub.drainage_lift_requirement;
    if (drain) {
      const drainText = pickText(drain, ['source_text', 'text']);
      if (drainText) {
        pushScalar(out, 'responder_information.submersion.drainage_lift_requirement', drainText);
      } else if (isPlainObject(drain)) {
        const parts = [
          asTrimmedString(drain.vehicle_end_to_raise),
          drain.approximate_lift_height_cm != null ? `${drain.approximate_lift_height_cm}cm` : null,
          asTrimmedString(drain.purpose),
        ].filter(Boolean);
        if (parts.length) {
          pushScalar(out, 'responder_information.submersion.drainage_lift_requirement', parts.join(' '));
        }
      }
    }
  }

  // Towing / transport / storage
  const tow = ri.towing_transport_storage ?? record.towing_transport_storage;
  if (tow) {
    pushArray(out, 'responder_information.towing_transport_storage.guidance', stringList(tow.guidance));
    const methodText = pickText(tow.transport_method, ['source_text', 'text', 'required_method']);
    if (methodText) {
      pushScalar(out, 'responder_information.towing_transport_storage.transport_method', methodText);
    }
    pushArray(
      out,
      'responder_information.towing_transport_storage.prohibited_methods',
      actionOrTextList(tow.prohibited_methods)
    );
    // Pre-transport checks (sheet green info box — not a red warning box).
    const preCheckTexts = asList(tow.pre_transport_checks)
      .map((c) => pickText(c, ['source_text', 'text', 'parameter']))
      .filter((t): t is string => Boolean(t));
    if (preCheckTexts.length) {
      pushArray(out, 'responder_information.towing_transport_storage.pre_transport_checks', preCheckTexts);
    }
    // post_incident_storage: keep in rich gold only for v1. The red-box wording is
    // scored under `warnings` (no double Exact). Section-scoped GT can reintroduce it later.
  }

  // Silent vehicle / identification
  const silent = ri.identification_recognition?.silent_vehicle_warning;
  const silentText = pickText(silent, ['source_text', 'text', 'hazard_type']);
  if (silentText) {
    pushScalar(
      out,
      'responder_information.identification_recognition.silent_vehicle_warning',
      silentText
    );
  }

  // Vehicle layout — structural zones + glazing keep sheet text.
  // components (legend + diagram locations): not Exact-projected for Cybertruck v1.
  const layout = record.vehicle_layout;
  if (layout) {
    pushArray(
      out,
      'vehicle_layout.structural_zones',
      asList(layout.structural_zones)
        .map((z) => {
          const text = pickText(z, ['source_text', 'text']);
          if (text) return text;
          if (!isPlainObject(z)) return null;
          return [z.zone_class, z.location_descriptor].filter(Boolean).join(' @ ') || null;
        })
        .filter((s): s is string => Boolean(s))
    );
    pushArray(
      out,
      'vehicle_layout.glazing',
      asList(layout.glazing)
        .map((g) => {
          const text = pickText(g, ['source_text', 'text']);
          if (text) return text;
          if (!isPlainObject(g)) return null;
          const locs = Array.isArray(g.glazing_locations)
            ? g.glazing_locations.map(String).join(', ')
            : '';
          const type = asTrimmedString(g.glazing_type);
          return type ? `${locs}: ${type}` : locs || null;
        })
        .filter((s): s is string => Boolean(s))
    );
  }

  // Warnings (document-order red boxes when gold is inventory-complete)
  pushArray(out, 'warnings', warningSummaries(record.warnings));

  // v1.0 top-level HV fallbacks (path aligned with battery rename)
  if (!out['vehicle.propulsion.high_voltage_battery'] && record.high_voltage_systems) {
    const hv = record.high_voltage_systems;
    pushScalar(out, 'high_voltage_systems.nominal_voltage_v', hv.nominal_voltage_v);
    pushArray(out, 'high_voltage_systems.disconnect', stringList(hv.disconnect));
    pushArray(
      out,
      'high_voltage_systems.cables',
      asList(hv.cables)
        .map((c) => pickText(c, ['description', 'source_text', 'text']))
        .filter((s): s is string => Boolean(s))
    );
  }

  // Drop empty arrays that were pushed with length 0 from map expressions
  for (const [k, field] of Object.entries(out)) {
    if (Array.isArray(field.value) && field.value.length === 0) {
      delete out[k];
    }
  }

  return out;
}

export function projectedPaths(record: RescueSheetV1): string[] {
  return Object.keys(project(record));
}

export function projectionToGoldenExtraction(proj: Projection): Record<string, ProjectedField> {
  return proj;
}

export function goldenProjection(record: RescueSheetV1): GoldenDataset {
  const proj = project(record);
  const golden_extraction: GoldenExtraction = {};
  for (const [path, field] of Object.entries(proj)) {
    golden_extraction[path] = { value: field.value };
  }
  return { golden_extraction };
}

export function evidenceById(record: RescueSheetV1): Map<string, Evidence> {
  const m = new Map<string, Evidence>();
  for (const e of record.evidence ?? []) m.set(e.evidence_id, e);
  return m;
}
