import { describe, expect, it } from 'vitest';
import { goldenPreviewItems, itemCountLabel, kindMeta, previewSnippet } from './golden-preview';

describe('goldenPreviewItems', () => {
  it('wraps a string as a single item', () => {
    expect(goldenPreviewItems('Tesla')).toEqual([{ text: 'Tesla' }]);
  });

  it('numbers list items', () => {
    expect(goldenPreviewItems(['Park', 'Chock'])).toEqual([
      { label: '01', text: 'Park' },
      { label: '02', text: 'Chock' },
    ]);
  });

  it('labels object keys', () => {
    expect(goldenPreviewItems({ manufacturer: 'Tesla', body_style: 'truck' })).toEqual([
      { key: 'manufacturer', label: 'Manufacturer', text: 'Tesla' },
      { key: 'body_style', label: 'Body Style', text: 'truck' },
    ]);
  });
});

describe('kindMeta', () => {
  it('distinguishes sequence lists from set lists', () => {
    expect(kindMeta('array', 'sequence').label).toBe('Sequence');
    expect(kindMeta('array', 'set').label).toBe('List');
    expect(kindMeta('string', 'set').label).toBe('Text');
    expect(kindMeta('object', 'set').label).toBe('Map');
  });
});

describe('itemCountLabel / previewSnippet', () => {
  it('counts list items and keys', () => {
    expect(itemCountLabel(['a', 'b'])).toBe('2 items');
    expect(itemCountLabel({ a: '1' })).toBe('1 key');
    expect(itemCountLabel('Tesla')).toBeNull();
    expect(itemCountLabel([])).toBeNull();
  });

  it('truncates long lists for card snippets', () => {
    expect(previewSnippet(['one', 'two', 'three', 'four'])).toBe('one · two · three · +1 more');
    expect(previewSnippet('not_found')).toBe('Not on the sheet');
  });
});
