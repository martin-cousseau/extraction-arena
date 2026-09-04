/**
 * LlamaExtract `data_schema` for the rescue-sheet domain body.
 *
 * This is NOT `schema.json`. LlamaExtract only accepts a JSON Schema subset
 * (named type, description, enum; optional = omit from `required`). Canonical
 * validation stays in schema.json + validate.ts. Envelope fields are stamped
 * after extract via normalizeVlmToDraft.
 *
 * Known LlamaExtract rejections we compile away:
 * - `const` without `type` (document_type)
 * - `type: ["array"|"object"|"string", "null"]` (rewritten to nested anyOf)
 * - array `items` that are objects with no `properties`
 * - additionalProperties / minLength / minimum / minItems
 */

export type LlamaExtractType = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';

export interface LlamaExtractSchema {
  type: LlamaExtractType;
  description?: string;
  properties?: Record<string, LlamaExtractSchema>;
  items?: LlamaExtractSchema;
  required?: string[];
  enum?: Array<string | number | boolean>;
}

const ENVELOPE_KEYS = new Set([
  'schema_version',
  'record_id',
  'lifecycle_status',
  'review',
  'evidence',
  'provenance',
  'legacy_fields',
]);

function str(description: string, extra?: Partial<LlamaExtractSchema>): LlamaExtractSchema {
  return { type: 'string', description, ...extra };
}

function num(description: string): LlamaExtractSchema {
  return { type: 'number', description };
}

function int(description: string): LlamaExtractSchema {
  return { type: 'integer', description };
}

function bool(description: string): LlamaExtractSchema {
  return { type: 'boolean', description };
}

function obj(
  description: string,
  properties: Record<string, LlamaExtractSchema>,
  required?: string[]
): LlamaExtractSchema {
  return {
    type: 'object',
    description,
    properties,
    ...(required && required.length > 0 ? { required } : {}),
  };
}

function arr(description: string, items: LlamaExtractSchema): LlamaExtractSchema {
  return { type: 'array', description, items };
}

const orderedStep = obj(
  'Numbered procedure step as printed on the sheet. Order is document sequence.',
  {
    step_number: int('1-based order in document sequence.'),
    action: str('Optional short snake_case id. Not the scoring target when source_text exists.'),
    condition: str('Optional condition printed with the step, e.g. only if necessary.'),
    source_text: str(
      'Verbatim step text from the sheet. Preserve capitalization and punctuation. Scoring target.'
    ),
    lift_height_cm: num('Lift height in centimetres if printed.'),
    source_equivalent_imperial: str('Imperial equivalent printed next to the metric value.'),
  }
);

const energySystem = obj(
  'High- or low-voltage energy system from the diagram or legend.',
  {
    nominal_voltage_v: num('Voltage as printed, e.g. 800 or 48.'),
    chemistry: str('Chemistry if printed, e.g. lithium_ion or Li-Ion.'),
    component_type: str('Component type if labeled, e.g. low_voltage_battery.'),
    component_class: str('Component class if labeled.'),
    energy_type: str('Energy type if labeled.'),
    source_text: str(
      'Printed diagram/legend label exactly (e.g. "800V Li-Ion", "48V Li-Ion"). Scoring target.'
    ),
  }
);

const colorZone = obj('Color-coded legend zone (lift, stabilization, or no-contact).', {
  color_code: str('Legend color word as printed, e.g. green, yellow, brown.'),
  meaning: str('Legend label for this color.'),
  component_class: str('Component class if the legend names one, e.g. high_voltage_battery.'),
  source_text: str(
    'Color word plus legend label as printed, e.g. "green Appropriate lift areas". Scoring target.'
  ),
});

const storedItem = obj('Stored energy, fluid, cable, or pyrotechnic item from the sheet.', {
  component_class: str('Component class if labeled.'),
  nominal_voltage_v: num('Voltage if printed.'),
  chemistry: str('Chemistry if printed.'),
  energy_type: str('Energy type if printed.'),
  source_text: str('Verbatim label or callout. Scoring target when present.'),
  cable_type: str('Cable type if labeled.'),
  insulation_color: str('Insulation color if labeled, e.g. orange.'),
  fluid_type: str('Fluid type if labeled.'),
  color: arr('Fluid or item colors if listed.', str('A single color word.')),
  presence_indicated_by: str('How presence is indicated on the sheet.'),
  action: str('Associated action if printed.'),
});

const prohibition = obj('Prohibited action printed on the sheet.', {
  action: str('Optional short snake_case id.'),
  source_text: str('Verbatim prohibition text. Scoring target.'),
});

const warningEntry = obj('A printed warning box or callout.', {
  warning_id: str('Stable id only if printed; do not invent ids that conflict with the text.'),
  procedure_phase: str('Procedure phase if labeled (immobilize, disable, fire, …).'),
  hazard_type: str('Hazard type if labeled.'),
  source_text: str('Full warning-box text, reading order. Scoring target.'),
});

/**
 * Domain-only JSON Schema sent to LlamaExtract as `data_schema`.
 */
export function llamaExtractDataSchema(): LlamaExtractSchema {
  return {
    type: 'object',
    description:
      'ISO-17840-style rescue-sheet domain body. Extract only what the document supports. Omit fields or use empty arrays when the sheet does not show them. Never invent envelope fields (record_id, lifecycle_status, review, evidence, provenance).',
    required: ['vehicle', 'responder_information'],
    properties: {
      standard_reference: obj('ISO / standard mapping printed or implied by the sheet layout.', {
        standard_id: str('Standard identifier if present, e.g. ISO 17840-1:2022.'),
        scope: str('Scope string if present.'),
        conformance_status: str('Conformance status if present.'),
      }),
      vehicle: obj('Vehicle identity and propulsion as printed on the sheet.', {
        manufacturer: str('OEM / manufacturer name as printed.'),
        model: str('Model name as printed.'),
        model_year: str('Model year string if printed as a single value.'),
        model_year_start: int('Start of model-year range if printed.'),
        model_year_end: int('End of model-year range if printed.'),
        vehicle_class: str('Vehicle class only if explicitly stated.'),
        body_style: str('Body style if stated, e.g. truck.'),
        door_count: int('Door count if stated.'),
        seating_capacity: int('Seating capacity if stated.'),
        propulsion: obj('Energy sources and voltage systems from badges, diagrams, or labels.', {
          primary_energy_source: str(
            'Fill only if the sheet states energy type explicitly. Do not guess electricity / battery_electric from an EV-looking diagram.'
          ),
          secondary_energy_sources: arr(
            'Additional energy sources if listed.',
            str('An energy-source label.')
          ),
          drivetrain: str('Drivetrain if printed, e.g. AWD.'),
          high_voltage_systems: arr(
            'High-voltage batteries / systems. Put the printed legend string (e.g. "800V Li-Ion") in source_text.',
            energySystem
          ),
          low_voltage_systems: arr(
            'Low-voltage batteries / systems. Put the printed legend string (e.g. "48V Li-Ion") in source_text.',
            energySystem
          ),
        }),
      }),
      responder_information: obj(
        'First-responder procedures in sheet order: identify, immobilize, stabilize, disable, access, stored energy, fire, submersion, towing/storage.',
        {
          identification_recognition: obj('How to recognize the vehicle and silent-movement hazards.', {
            vehicle_recognition: obj('Exterior identification notes as printed.', {
              exterior_model_badge_note: str('Note about whether the model name appears on the exterior.'),
              tri_motor_identifier_note: str('Note about a tri-motor or performance identifier if printed.'),
            }),
            silent_vehicle_warning: obj('Silent-movement / unexpected-restart warning.', {
              hazard_type: str('Hazard type if labeled.'),
              source_text: str('Verbatim warning text. Scoring target.'),
            }),
          }),
          immobilization: obj('Immobilization procedure.', {
            ordered_steps: arr('Immobilization steps in printed order.', orderedStep),
          }),
          stabilization_lifting: obj('Lift, stabilize, and no-contact zones from the color legend.', {
            lift_areas: arr('Appropriate lift areas (often green).', colorZone),
            stabilization_points: arr('Safe stabilization points (often yellow).', colorZone),
            no_contact_zones: arr('No-contact / hazard zones (battery, etc.).', colorZone),
          }),
          disable_direct_hazards: obj('Disable / isolate energy before extrication.', {
            ordered_steps: arr('Disable steps in printed order.', orderedStep),
            first_responder_loop: obj('First-responder loop instruction.', {
              action: str('Action id if labeled, e.g. double_cut.'),
              source_text: str('Verbatim loop instruction. Scoring target.'),
            }),
            low_voltage_isolation: obj('Low-voltage isolation instruction.', {
              battery_voltage_v: num('LV battery voltage if printed, e.g. 48.'),
              action: str('Action id if labeled.'),
              condition: str('Condition if printed, e.g. only if necessary.'),
              source_text: str('Verbatim LV isolation text.'),
            }),
            high_voltage_isolation: obj('High-voltage isolation warning.', {
              warning: str('Warning summary if labeled.'),
              prohibited_action: str('Prohibited action if printed.'),
              ppe_required: bool('Whether PPE is required, only if the sheet says so.'),
              source_text: str('Verbatim HV isolation text. Scoring target.'),
            }),
          }),
          occupant_access: obj('Occupant access, glazing, and extrication constraints.', {
            access_methods: arr(
              'Access methods (doors, glass, etc.).',
              obj('One access method.', {
                access_target: str('What is being accessed, e.g. door, windshield.'),
                access_direction: str('Direction if printed, e.g. from outside.'),
                power_state: str('Power state if printed, e.g. with 12V/48V power.'),
                procedure_availability: str('Whether the procedure is available / powered.'),
                action: str('Action id if labeled.'),
                source_text: str('Verbatim access instruction. Scoring target.'),
                ordered_steps: arr('Substeps if the method is a numbered list.', orderedStep),
              })
            ),
            extrication_constraints: arr(
              'Extrication constraints / hazards.',
              obj('One constraint.', {
                hazard_type: str('Hazard type if labeled.'),
                source_text: str('Verbatim constraint text. Scoring target.'),
              })
            ),
          }),
          stored_energy_fluids_gases_solids: obj(
            'Stored energy, HV cables, fluids, pyrotechnics, and related prohibitions.',
            {
              energy_sources: arr('Energy sources listed in this section.', storedItem),
              high_voltage_cables: arr('High-voltage cable callouts.', storedItem),
              fluids: arr('Fluids listed on the sheet.', storedItem),
              pyrotechnic_devices: arr('Pyrotechnic / pretensioner / airbag devices.', storedItem),
              prohibited_actions: arr('Prohibited actions in this section.', prohibition),
            }
          ),
          fire: obj('Fire, suppression, cooling, and reignition guidance.', {
            prohibitions: arr('Fire-related prohibitions.', prohibition),
            suppression_cooling_actions: arr(
              'Suppression or cooling actions.',
              obj('One suppression/cooling action.', {
                action: str('Action id if labeled.'),
                target: str('Target if labeled, e.g. battery pack.'),
                application_direction: str('Application direction if printed.'),
                source_text: str('Verbatim action text. Scoring target.'),
              })
            ),
            monitoring_requirements: arr(
              'Post-fire monitoring requirements.',
              obj('One monitoring requirement.', {
                parameter: str('Parameter if labeled, e.g. temperature.'),
                description: str('Description if printed.'),
                minimum_duration_hours: num('Minimum duration in hours if printed.'),
                source_text: str('Verbatim monitoring text. Scoring target.'),
              })
            ),
            reignition_risk: obj('Reignition risk callout.', {
              risk_present: bool('Whether reignition risk is stated, only if the sheet says so.'),
              source_text: str('Verbatim reignition warning. Scoring target.'),
            }),
            extinguishing_agents: arr(
              'Extinguishing agents if listed.',
              str('An agent name as printed.')
            ),
          }),
          submersion: obj('Submersion / flood guidance.', {
            ordered_steps: arr('Submersion steps in printed order.', orderedStep),
            drainage_lift_requirement: obj('Drain/lift instruction after submersion.', {
              vehicle_end_to_raise: str('Which end to raise if printed, e.g. front.'),
              approximate_lift_height_cm: num('Lift height in centimetres if printed.'),
              source_equivalent_imperial: str('Imperial equivalent if printed.'),
              purpose: str('Purpose of the lift if printed.'),
              source_text: str('Verbatim drain/lift sentence. Scoring target.'),
            }),
            hazard_note: str('Verbatim submersion hazard sentence.'),
            guidance: arr('Additional guidance sentences.', str('One guidance sentence.')),
          }),
          towing_transport_storage: obj('Towing, transport, and post-incident storage.', {
            transport_method: obj('Required transport method.', {
              required_method: str('Method id if labeled, e.g. flatbed_towing_truck.'),
              source_text: str('Verbatim transport instruction. Scoring target.'),
            }),
            prohibited_methods: arr('Prohibited towing/transport methods.', prohibition),
            pre_transport_checks: arr(
              'Checks required before transport.',
              obj('One pre-transport check.', {
                parameter: str('Parameter if labeled, e.g. high_voltage_battery_temperature.'),
                source_text: str('Verbatim check text. Scoring target.'),
              })
            ),
            post_incident_storage: obj('Post-incident storage / reignition distance.', {
              applies_after: str('When this applies, e.g. fire_incident.'),
              storage_location: str('Location if printed, e.g. outside.'),
              minimum_separation_m: num('Minimum separation in metres if printed.'),
              source_equivalent_imperial: str('Imperial equivalent if printed.'),
              separate_from: arr(
                'What to separate from if listed.',
                str('e.g. other_vehicles, structures.')
              ),
              hazard_note: str('Hazard note if printed.'),
              source_text: str('Verbatim storage/reignition warning. Scoring target.'),
            }),
            guidance: arr('Additional towing/storage sentences.', str('One guidance sentence.')),
          }),
        }
      ),
      vehicle_layout: obj('Component locations, structural zones, and glazing. Locations are textual — never coordinates.', {
        components: arr(
          'Diagram components (battery, cables, airbags, SRS, …).',
          obj('One layout component.', {
            component_class: str('Component class as labeled or clearly diagrammed.'),
            system: str('System if labeled, e.g. high_voltage.'),
            location_descriptor: str('Textual location. No pixel coordinates or bounding boxes.'),
            diagram_views: arr('Views where it appears, e.g. top_down, side_view.', str('A view name.')),
            location_confidence: str('How the location is supported, e.g. direct_diagram_representation.'),
            note: str('Optional note when endpoints or positions are not labeled in text.'),
          })
        ),
        structural_zones: arr(
          'High-strength / structural zones.',
          obj('One structural zone.', {
            zone_class: str('Zone class if labeled.'),
            location_descriptor: str('Textual location. No coordinates.'),
            source_text: str('Verbatim zone label if printed.'),
          })
        ),
        glazing: arr(
          'Glazing types and locations.',
          obj('One glazing entry.', {
            glazing_locations: arr('Locations if listed.', str('A location label.')),
            glazing_type: str('Type if labeled, e.g. laminated, tempered.'),
            source_text: str('Verbatim glazing text.'),
          })
        ),
      }),
      warnings: arr(
        'Every red warning box as a separate entry, in document reading order. source_text = full box text.',
        warningEntry
      ),
    },
  };
}

export function isEnvelopeKey(key: string): boolean {
  return ENVELOPE_KEYS.has(key);
}

const UNSUPPORTED_KEYS = new Set([
  'const',
  'additionalProperties',
  'minLength',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'pattern',
  'format',
  'default',
  '$ref',
  '$defs',
  'definitions',
  'allOf',
  'oneOf',
  'anyOf',
  'not',
]);

/**
 * Walk a schema and report constructs LlamaExtract has rejected (or documents as unsupported).
 * Used by tests to keep `llamaExtractDataSchema()` in the allowed subset.
 */
export function llamaExtractIncompatibilities(schema: unknown, path = '$'): string[] {
  const issues: string[] = [];
  if (schema == null || typeof schema !== 'object' || Array.isArray(schema)) {
    issues.push(`${path}: schema node must be an object`);
    return issues;
  }
  const node = schema as Record<string, unknown>;

  for (const key of Object.keys(node)) {
    if (UNSUPPORTED_KEYS.has(key)) {
      issues.push(`${path}: unsupported keyword "${key}"`);
    }
  }

  if (typeof node.type !== 'string') {
    issues.push(`${path}: type must be a single string (not a union array, const-only, or missing)`);
    return issues;
  }

  if (node.type === 'object') {
    const properties = node.properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
      issues.push(`${path}: object type requires a properties map`);
    } else {
      const keys = Object.keys(properties as Record<string, unknown>);
      if (keys.length === 0) {
        issues.push(`${path}: object properties must not be empty`);
      }
      for (const [key, child] of Object.entries(properties as Record<string, unknown>)) {
        issues.push(...llamaExtractIncompatibilities(child, `${path}.properties.${key}`));
      }
    }
  }

  if (node.type === 'array') {
    if (node.items == null) {
      issues.push(`${path}: array type requires items`);
    } else {
      issues.push(...llamaExtractIncompatibilities(node.items, `${path}.items`));
    }
  }

  return issues;
}
