import { describe, expect, it } from 'vitest';
import { evaluateField } from '@/lib/evaluation/evaluate';
import type { FieldEvalConfig } from '@/lib/evaluation/types';
import { buildFieldDiffRows, displayItem } from './field-diff';

const sequenceExact: FieldEvalConfig = {
  matchStrategy: 'exact',
  listMode: 'sequence',
  priority: 'recall',
};

const setPartial: FieldEvalConfig = {
  matchStrategy: 'partial',
  listMode: 'set',
  priority: 'recall',
};

describe('displayItem', () => {
  it('renders object items without the NUL separator', () => {
    expect(displayItem('color\u0000green', 'object')).toBe('color: green');
  });
});

describe('buildFieldDiffRows', () => {
  it('keeps scalars as a single expected/returned pair', () => {
    const field = evaluateField('Cybertruck', 'cybertruck', 'vehicle.model', {
      matchStrategy: 'exact',
      listMode: 'set',
      priority: 'precision',
    });
    const rows = buildFieldDiffRows(field, 'cybertruck', 'Cybertruck');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('match');
    expect(rows[0]?.expected).toBe('cybertruck');
    expect(rows[0]?.actual).toBe('Cybertruck');
  });

  it('marks a sequence miss and a tail extra', () => {
    const field = evaluateField(
      ['Park the vehicle', 'Invented step'],
      ['Park the vehicle', 'Disable 12V', 'Cut SRS'],
      'immobilization.ordered_steps',
      sequenceExact
    );
    const rows = buildFieldDiffRows(
      field,
      ['Park the vehicle', 'Disable 12V', 'Cut SRS'],
      ['Park the vehicle', 'Invented step']
    );
    expect(rows.map((r) => r.status)).toEqual(['match', 'partial', 'missing']);
    expect(rows[1]?.expected).toBe('Disable 12V');
    expect(rows[1]?.actual).toBe('Invented step');
    expect(rows[2]?.expected).toBe('Cut SRS');
    expect(rows[2]?.actual).toBeUndefined();
  });

  it('appends sequence tail extras when the model is longer', () => {
    const field = evaluateField(
      ['Park the vehicle', 'Disable 12V', 'Invented step'],
      ['Park the vehicle', 'Disable 12V'],
      'immobilization.ordered_steps',
      sequenceExact
    );
    const rows = buildFieldDiffRows(
      field,
      ['Park the vehicle', 'Disable 12V'],
      ['Park the vehicle', 'Disable 12V', 'Invented step']
    );
    expect(rows.map((r) => r.status)).toEqual(['match', 'match', 'extra']);
    expect(rows[2]?.actual).toBe('Invented step');
  });

  it('shows unmatched set items as extras', () => {
    const field = evaluateField(
      ['battery fire', 'made up hazard'],
      ['battery fire', 'reignition'],
      'warnings',
      setPartial
    );
    const rows = buildFieldDiffRows(
      field,
      ['battery fire', 'reignition'],
      ['battery fire', 'made up hazard']
    );
    const statuses = rows.map((r) => r.status);
    expect(statuses).toContain('match');
    expect(statuses).toContain('missing');
    expect(statuses).toContain('extra');
    expect(rows.find((r) => r.status === 'extra')?.actual).toBe('made up hazard');
    expect(rows.find((r) => r.status === 'missing')?.expected).toBe('reignition');
  });
});
