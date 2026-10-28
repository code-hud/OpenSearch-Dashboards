/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TableColumnUnitOptions } from './table_column_unit_options';
import { defaultTableChartStyles, TableChartStyle } from './table_vis_config';
import { VisColumn, VisFieldType } from '../types';

describe('TableColumnUnitOptions', () => {
  const numericalColumns: VisColumn[] = [
    { id: 1, name: 'Latency', schema: VisFieldType.Numerical, column: 'field-1' },
    { id: 2, name: 'Bytes', schema: VisFieldType.Numerical, column: 'field-2' },
  ];

  const renderOptions = (styleOptions: Partial<TableChartStyle> = {}) => {
    const onStyleChange = jest.fn();
    render(
      <TableColumnUnitOptions
        styleOptions={{ ...defaultTableChartStyles, ...styleOptions }}
        onStyleChange={onStyleChange}
        numericalColumns={numericalColumns}
      />
    );
    return onStyleChange;
  };

  it('adds an empty column unit', () => {
    const onStyleChange = renderOptions();
    fireEvent.click(screen.getByTestId('visTableAddColumnUnit'));
    expect(onStyleChange).toHaveBeenCalledWith({ columnUnits: [{ field: '' }] });
  });

  it('sets the field of a column unit', () => {
    const onStyleChange = renderOptions({ columnUnits: [{ field: '' }] });
    fireEvent.change(screen.getByTestId('visTableColumnUnitField0'), {
      target: { value: 'field-2' },
    });
    expect(onStyleChange).toHaveBeenCalledWith({ columnUnits: [{ field: 'field-2' }] });
  });

  it('sets the unit of a column unit', async () => {
    const onStyleChange = renderOptions({ columnUnits: [{ field: 'field-2' }] });
    fireEvent.click(screen.getByPlaceholderText('Select a unit'));
    fireEvent.click(screen.getByText('Data'));
    fireEvent.click(await screen.findByText('bytes(B)'));
    expect(onStyleChange).toHaveBeenCalledWith({
      columnUnits: [{ field: 'field-2', unitId: 'bytes' }],
    });
  });

  it('clears the unit of a column unit', () => {
    const onStyleChange = renderOptions({ columnUnits: [{ field: 'field-2', unitId: 'bytes' }] });
    fireEvent.click(screen.getByTestId('clearUnitButton'));
    expect(onStyleChange).toHaveBeenCalledWith({
      columnUnits: [{ field: 'field-2', unitId: undefined }],
    });
  });

  it('removes a column unit', () => {
    const onStyleChange = renderOptions({
      columnUnits: [
        { field: 'field-1', unitId: 'percentage' },
        { field: 'field-2', unitId: 'bytes' },
      ],
    });
    fireEvent.click(screen.getByTestId('visTableRemoveColumnUnit0'));
    expect(onStyleChange).toHaveBeenCalledWith({
      columnUnits: [{ field: 'field-2', unitId: 'bytes' }],
    });
  });

  it('does not offer fields that already have a unit', () => {
    renderOptions({ columnUnits: [{ field: 'field-1' }, { field: '' }] });
    const secondFieldSelect = screen.getByTestId('visTableColumnUnitField1');
    const optionValues = Array.from(secondFieldSelect.querySelectorAll('option')).map((option) =>
      option.getAttribute('value')
    );
    expect(optionValues).toEqual(['', 'field-2']);
  });

  it('hides the add button when every numerical column has a unit', () => {
    renderOptions({ columnUnits: [{ field: 'field-1' }, { field: 'field-2' }] });
    expect(screen.queryByTestId('visTableAddColumnUnit')).not.toBeInTheDocument();
  });
});
