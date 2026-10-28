/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildValueLabel } from './value_label_options';

const formatLabel = (props: Parameters<typeof buildValueLabel>[0], value: number) => {
  const config = buildValueLabel(props) as {
    label: { formatter: (params: { value?: unknown }) => string };
  };
  return config.label.formatter({ value });
};

describe('buildValueLabel', () => {
  it('returns no label config when values are hidden', () => {
    expect(buildValueLabel({ showValues: false, valueField: 'count' })).toEqual({});
  });

  it('formats time values with full words by default', () => {
    expect(
      formatLabel({ showValues: true, valueField: 'count', unitId: 'millisecond' }, 1500)
    ).toBe('1.5 seconds');
  });

  it('formats time values with short labels when enabled', () => {
    expect(
      formatLabel(
        { showValues: true, valueField: 'count', unitId: 'millisecond', shortUnitLabels: true },
        1500
      )
    ).toBe('1.5 sec');
  });
});
