import { describe, expect, it } from 'vitest';
import { evaluateDataset } from './evaluate';
import { parseInsightsResponse, selectInsightsCandidates } from './insights';
import { INSIGHTS_MODEL_ID, INSIGHTS_PROMPT_VERSION } from './insightsPrompt';
import type { GoldenDataset } from '../dataset';

describe('selectInsightsCandidates', () => {
  it('skips perfect fields and includes mismatches', () => {
    const golden: GoldenDataset = {
      golden_extraction: {
        'vehicle.model': { value: 'Cybertruck' },
        'vehicle.body_style': { value: 'truck' },
      },
    };
    const ev = evaluateDataset(
      { 'vehicle.model': 'Cybertruck', 'vehicle.body_style': 'sedan' },
      golden
    );
    const cands = selectInsightsCandidates(ev, golden, {
      'vehicle.model': 'Cybertruck',
      'vehicle.body_style': 'sedan',
    });
    expect(cands.map((c) => c.fieldKey)).toEqual(['vehicle.body_style']);
  });
});

describe('parseInsightsResponse', () => {
  it('keeps valid themes and drops unknown field paths', () => {
    const parsed = parseInsightsResponse(
      {
        summary: 'Voltage labels drifted.',
        themes: [
          {
            title: 'HV labels',
            severity: 'high',
            fields: ['stored_energy.high_voltage_systems', 'invented.path'],
            detail: 'Returned 400V instead of 800V.',
          },
          { title: '', severity: 'low', fields: [], detail: 'skip me' },
        ],
        strengths: ['Vehicle identity was correct.', 12],
      },
      ['stored_energy.high_voltage_systems']
    );
    expect(parsed.summary).toBe('Voltage labels drifted.');
    expect(parsed.themes).toHaveLength(1);
    expect(parsed.themes[0]?.fields).toEqual(['stored_energy.high_voltage_systems']);
    expect(parsed.themes[0]?.severity).toBe('high');
    expect(parsed.strengths).toEqual(['Vehicle identity was correct.']);
    expect(parsed.model).toBe(INSIGHTS_MODEL_ID);
    expect(parsed.promptVersion).toBe(INSIGHTS_PROMPT_VERSION);
  });

  it('falls back when the model returns junk', () => {
    const parsed = parseInsightsResponse(null, []);
    expect(parsed.summary).toMatch(/did not return/i);
    expect(parsed.themes).toEqual([]);
    expect(parsed.strengths).toEqual([]);
  });
});
