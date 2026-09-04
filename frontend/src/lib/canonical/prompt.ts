import type { RescueSheetV1 } from './schema';
import { SCHEMA_VERSION } from './schema';

/** Empty nested skeleton matching rescue-sheet-ev-v1.1. Gold values are not included. */
export const EMPTY_RICH_SKELETON = {
  vehicle: {
    manufacturer: '<string>',
    model: '<string>',
    model_year_start: '<integer or null>',
    model_year_end: '<integer or null>',
    vehicle_class: '<string>',
    body_style: '<string>',
    door_count: '<integer>',
    seating_capacity: '<integer>',
    propulsion: {
      primary_energy_source:
        '<optional inferred enum: battery_electric | … — only if explicitly supported; do not invent>',
      high_voltage_systems: [
        {
          nominal_voltage_v: '<number optional>',
          chemistry: '<string optional>',
          component_type: '<string optional>',
          source_text: '<diagram/legend label e.g. 800V Li-Ion — scored as high-voltage battery>',
        },
      ],
      low_voltage_systems: [
        {
          nominal_voltage_v: '<number optional>',
          chemistry: '<string optional>',
          component_type: '<string optional>',
          source_text: '<diagram/legend label e.g. 48V Li-Ion — scored as low-voltage battery>',
        },
      ],
    },
  },
  responder_information: {
    identification_recognition: {
      vehicle_recognition: {
        exterior_model_badge_note: '<string>',
        tri_motor_identifier_note: '<string>',
      },
      silent_vehicle_warning: {
        hazard_type: '<string>',
        source_text: '<verbatim quote>',
      },
    },
    immobilization: {
      ordered_steps: [
        {
          step_number: 1,
          action: '<optional snake_case id>',
          source_text: '<verbatim step text from sheet — scored>',
        },
      ],
    },
    stabilization_lifting: {
      lift_areas: [
        {
          color_code: '<legend color word e.g. green>',
          meaning: '<legend label>',
          source_text: '<color + label as on legend, e.g. green Appropriate lift areas>',
        },
      ],
      stabilization_points: [
        {
          color_code: '<legend color word e.g. yellow>',
          meaning: '<legend label>',
          source_text: '<color + label as on legend>',
        },
      ],
      no_contact_zones: [
        {
          color_code: '<legend color word>',
          component_class: '<optional>',
          meaning: '<legend label>',
          source_text: '<color + label as on legend>',
        },
      ],
    },
    disable_direct_hazards: {
      ordered_steps: [
        {
          step_number: 1,
          action: '<optional snake_case id>',
          condition: '<optional string>',
          source_text: '<verbatim step text from sheet — scored>',
        },
      ],
      first_responder_loop: { action: '<string>', source_text: '<verbatim>' },
      low_voltage_isolation: {
        battery_voltage_v: '<number>',
        action: '<string>',
        condition: '<string>',
      },
      high_voltage_isolation: {
        warning: '<string>',
        prohibited_action: '<string>',
        ppe_required: '<boolean>',
        source_text: '<verbatim>',
      },
    },
    occupant_access: {
      access_methods: [
        {
          access_target: '<string>',
          access_direction: '<string>',
          power_state: '<string>',
          procedure_availability: '<string>',
          action: '<optional>',
          source_text: '<verbatim>',
          ordered_steps: [
            { step_number: 1, action: '<string>', source_text: '<verbatim>' },
          ],
        },
      ],
      extrication_constraints: [{ hazard_type: '<string>', source_text: '<verbatim>' }],
    },
    stored_energy_fluids_gases_solids: {
      energy_sources: [
        {
          component_class: '<string>',
          nominal_voltage_v: '<number>',
          chemistry: '<string>',
          energy_type: '<string>',
          source_text: '<verbatim>',
        },
      ],
      high_voltage_cables: [
        {
          cable_type: '<string>',
          insulation_color: '<string>',
          source_text: '<verbatim>',
        },
      ],
      fluids: [{ fluid_type: '<string>', color: ['<string>'], source_text: '<verbatim>' }],
      pyrotechnic_devices: [
        { component_class: '<string>', presence_indicated_by: '<string>' },
      ],
      prohibited_actions: [{ action: '<string>', source_text: '<verbatim>' }],
    },
    fire: {
      prohibitions: [{ action: '<string>', source_text: '<verbatim>' }],
      suppression_cooling_actions: [
        {
          action: '<string>',
          target: '<string>',
          application_direction: '<string>',
          source_text: '<verbatim>',
        },
      ],
      monitoring_requirements: [
        {
          parameter: '<string>',
          minimum_duration_hours: '<number>',
          source_text: '<verbatim>',
        },
      ],
      reignition_risk: { risk_present: '<boolean>', source_text: '<verbatim>' },
    },
    submersion: {
      ordered_steps: [
        {
          step_number: 1,
          action: '<optional snake_case id>',
          source_text: '<verbatim step text from sheet — scored>',
          lift_height_cm: '<number optional>',
          source_equivalent_imperial: '<string optional>',
        },
      ],
      guidance: ['<verbatim framing sentence if present>'],
      drainage_lift_requirement: {
        vehicle_end_to_raise: '<string>',
        approximate_lift_height_cm: '<number>',
        source_equivalent_imperial: '<string>',
        purpose: '<string>',
        source_text: '<verbatim drain/lift sentence from sheet — scored when present>',
      },
      hazard_note: '<verbatim hazard sentence>',
    },
    towing_transport_storage: {
      transport_method: { required_method: '<optional id>', source_text: '<verbatim section text>' },
      prohibited_methods: [{ action: '<optional id>', source_text: '<verbatim section text>' }],
      pre_transport_checks: [
        { parameter: '<optional>', source_text: '<verbatim callout text in this section>' },
      ],
      post_incident_storage: {
        applies_after: '<optional>',
        storage_location: '<optional>',
        minimum_separation_m: '<optional number>',
        source_equivalent_imperial: '<optional>',
        separate_from: ['<optional>'],
        hazard_note: '<optional>',
        source_text: '<verbatim storage/reignition warning in this section if present>',
      },
    },
  },
  vehicle_layout: {
    components: [
      {
        component_class: '<string>',
        system: '<string optional>',
        location_descriptor: '<textual location, no coordinates>',
        diagram_views: ['<string>'],
        location_confidence: '<string>',
        note: '<optional>',
      },
    ],
    structural_zones: [
      {
        zone_class: '<string>',
        location_descriptor: '<string>',
        source_text: '<verbatim>',
      },
    ],
    glazing: [
      {
        glazing_locations: ['<string>'],
        glazing_type: '<string>',
        source_text: '<verbatim>',
      },
    ],
  },
  warnings: [
    {
      warning_id: '<stable_id>',
      procedure_phase: '<string>',
      hazard_type: '<string>',
      source_text: '<verbatim>',
    },
  ],
} as const;

/**
 * Build the vision extraction prompt. `record` is accepted for API stability
 * but does NOT gate the field list — the full empty skeleton is always used.
 */
export function buildCanonicalPrompt(_record: RescueSheetV1, documentContext = ''): string {
  const ctx = documentContext.trim();
  const contextClause = ctx ? `The document is: ${ctx}.` : '';
  const skeleton = JSON.stringify(EMPTY_RICH_SKELETON, null, 2);

  return `You are a rescue-sheet data-extraction engine. ${contextClause} Analyze the provided rescue-sheet images and return a single valid JSON object matching schema "${SCHEMA_VERSION}".

Return ONLY the domain body below (do not invent envelope fields like record_id, lifecycle_status, review, or evidence — those are stamped server-side). Fill every leaf you can support from the images; use the exact nested structure.

Empty nested skeleton (placeholders only — replace with real extracted values; never copy placeholder angle-bracket text into the output):
${skeleton}

Rules:
- Extract ONLY what is explicitly visible in the document (text or clear diagram labels). Do not infer or hallucinate.
- Absent scalar leaf → "not_found" (or null when the schema example uses null). Absent array leaf → [].
- ordered_steps: always fill source_text with the step as printed (or the shortest faithful quote from the sheet). action is an optional short snake_case id — source_text is the fidelity target.
- Battery labels: put the printed diagram/legend string (e.g. "800V Li-Ion", "48V Li-Ion") in high_voltage_systems / low_voltage_systems source_text. Do not invent component locations.
- primary_energy_source: leave null/not_found unless the sheet states energy type explicitly — do not guess "electricity".
- Legend zones (lift / stabilization / no-contact): include the color word and the legend label in source_text (e.g. "green Appropriate lift areas"). Do not invent spatial coordinates.
- Warnings: extract every red warning box as a separate warnings[] entry with source_text = full box text, in document reading order. Do not invent warning_id values that conflict with the text.
- Section callouts (towing / fire / etc.): extract the printed content of each section and its embedded boxes as the matching section fields — extract text, not "green box" / "red box" as meta answers.
- Locations are textual (location_descriptor). Never invent pixel coordinates or bounding boxes.
- Order matters: return array entries in EXACT document order (top-to-bottom, left-to-right). Number ordered_steps 1, 2, 3… in document sequence.
- Casing matters: preserve EXACT source capitalization in source_text fields.
- Preserve exact wording, spelling, and punctuation in source_text (normalize hard line wraps inside a box to spaces).
- Return ONLY valid JSON with no markdown fences and no commentary.`;
}
