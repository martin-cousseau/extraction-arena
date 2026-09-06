import { describe, expect, it } from 'vitest';
import type { RescueSheetV1 } from './schema';
import { project } from './project';
import fixture from './fixtures/cybertruck-rich-source.json';

const ctxVehicle = {
  manufacturer: 'Tesla',
  model: 'Cybertruck',
  propulsion: { primary_energy_source: 'battery_electric' },
};

describe('project ordered_steps', () => {
  it('scores Cybertruck gold source_text, not action ids', () => {
    const proj = project(fixture as RescueSheetV1);
    expect(proj['responder_information.submersion.ordered_steps']?.value).toEqual([
      'Wear appropriate PPE for water rescue.',
      'Remove the vehicle from the water',
      'continue with normal high voltage disabling',
      'Raise the front of the vehicle approximately 30 cm (1 foot) to allow water to drain out of the vehicle and battery pack',
      'store the vehicle flat',
    ]);
  });

  it('keeps string-shaped extractor steps instead of dropping the path', () => {
    const proj = project({
      schema_version: 'rescue-sheet-ev-v1.1',
      record_id: 't',
      lifecycle_status: 'draft',
      vehicle: ctxVehicle,
      responder_information: {
        submersion: {
          ordered_steps: [
            'Wear appropriate PPE for water rescue.',
            'Remove the vehicle from the water',
          ],
        },
      },
    } as unknown as RescueSheetV1);
    expect(proj['responder_information.submersion.ordered_steps']?.value).toEqual([
      'Wear appropriate PPE for water rescue.',
      'Remove the vehicle from the water',
    ]);
  });

  it('reads alternate text keys and citation-style { value } wrappers', () => {
    const proj = project({
      schema_version: 'rescue-sheet-ev-v1.1',
      record_id: 't',
      lifecycle_status: 'draft',
      vehicle: ctxVehicle,
      responder_information: {
        submersion: {
          ordered_steps: [
            { step_number: 1, text: 'Wear appropriate PPE for water rescue.' },
            { source_text: { value: 'Remove the vehicle from the water' } },
          ],
        },
      },
    } as unknown as RescueSheetV1);
    expect(proj['responder_information.submersion.ordered_steps']?.value).toEqual([
      'Wear appropriate PPE for water rescue.',
      'Remove the vehicle from the water',
    ]);
  });

  it('does not throw when ordered_steps is a single string', () => {
    const proj = project({
      schema_version: 'rescue-sheet-ev-v1.1',
      record_id: 't',
      lifecycle_status: 'draft',
      vehicle: ctxVehicle,
      responder_information: {
        submersion: {
          ordered_steps: 'Wear appropriate PPE for water rescue.',
        },
      },
    } as unknown as RescueSheetV1);
    expect(proj['responder_information.submersion.ordered_steps']?.value).toEqual([
      'Wear appropriate PPE for water rescue.',
    ]);
  });
});
