/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatValueWithUnit, getColumnUnitId } from './table_vis_utils';

describe('getColumnUnitId', () => {
  it('returns the unit configured for the column', () => {
    expect(getColumnUnitId([{ field: 'bytes', unitId: 'bytes' }], 'bytes')).toBe('bytes');
  });

  it('returns undefined when the column has no unit', () => {
    expect(getColumnUnitId([{ field: 'other', unitId: 'bytes' }], 'bytes')).toBeUndefined();
    expect(getColumnUnitId([{ field: 'bytes' }], 'bytes')).toBeUndefined();
    expect(getColumnUnitId(undefined, 'bytes')).toBeUndefined();
  });

  it('ignores unknown unit ids', () => {
    expect(getColumnUnitId([{ field: 'bytes', unitId: 'not-a-unit' }], 'bytes')).toBeUndefined();
  });
});

describe('formatValueWithUnit', () => {
  it('formats numbers with the unit', () => {
    expect(formatValueWithUnit(1500, 'bytes')).toBe('1.5 KB');
    expect(formatValueWithUnit(42, 'percentage')).toBe('42 %');
  });

  it('returns the value unchanged without a unit', () => {
    expect(formatValueWithUnit(1500, undefined)).toBe(1500);
  });

  it('returns non-numeric values unchanged', () => {
    expect(formatValueWithUnit('1500', 'bytes')).toBe('1500');
    expect(formatValueWithUnit(null, 'bytes')).toBeNull();
    expect(formatValueWithUnit(undefined, 'bytes')).toBeUndefined();
    expect(formatValueWithUnit(NaN, 'bytes')).toBeNaN();
    const obj = { a: 1 };
    expect(formatValueWithUnit(obj, 'bytes')).toBe(obj);
  });
});
