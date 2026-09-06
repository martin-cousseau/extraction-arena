import { describe, expect, it } from 'vitest';
import { project } from './project';
import { normalizeVlmToDraft } from './vlm';
import type { SourceContext } from './adapters/types';

const ctx: SourceContext = {
  recordId: 'run-1',
  receivedAt: '2026-01-01T00:00:00.000Z',
  sourcePages: [{ page_id: 'file:1', page_number: 1 }],
  sourceFormat: 'test',
};

function projectedSteps(modelJson: unknown): unknown {
  const draft = normalizeVlmToDraft(modelJson, ctx);
  return project(draft)['responder_information.submersion.ordered_steps']?.value;
}

describe('normalizeVlmToDraft extract shapes', () => {
  const steps = {
    responder_information: {
      submersion: {
        ordered_steps: [
          { step_number: 1, source_text: 'Wear appropriate PPE for water rescue.' },
          { step_number: 2, source_text: 'Remove the vehicle from the water' },
        ],
      },
    },
    vehicle: { manufacturer: 'Tesla', model: 'Cybertruck' },
  };

  it('unwraps a one-element extract_result array', () => {
    expect(projectedSteps([steps])).toEqual([
      'Wear appropriate PPE for water rescue.',
      'Remove the vehicle from the water',
    ]);
  });

  it('unwraps a { data } envelope', () => {
    expect(projectedSteps({ data: steps })).toEqual([
      'Wear appropriate PPE for water rescue.',
      'Remove the vehicle from the water',
    ]);
  });

  it('coerces string ordered_steps before project()', () => {
    expect(
      projectedSteps({
        vehicle: { manufacturer: 'Tesla', model: 'Cybertruck' },
        responder_information: {
          submersion: {
            ordered_steps: ['Wear appropriate PPE for water rescue.', 'Remove the vehicle from the water'],
          },
        },
      })
    ).toEqual([
      'Wear appropriate PPE for water rescue.',
      'Remove the vehicle from the water',
    ]);
  });

  it('coerces { text } steps', () => {
    const draft = normalizeVlmToDraft(
      {
        vehicle: { manufacturer: 'Tesla', model: 'Cybertruck' },
        responder_information: {
          submersion: {
            ordered_steps: [{ text: 'Wear appropriate PPE for water rescue.' }],
          },
        },
      },
      ctx
    );
    expect(draft.responder_information?.submersion?.ordered_steps?.[0]?.source_text).toBe(
      'Wear appropriate PPE for water rescue.'
    );
  });
});
