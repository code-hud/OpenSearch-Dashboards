/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@osd/i18n';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import { ColumnUnitConfig, TableChartStyle } from './table_vis_config';
import { VisColumn } from '../types';
import { StyleAccordion } from '../style_panel/style_accordion';
import { UnitPanel } from '../style_panel/unit/unit_panel';

export interface TableColumnUnitOptionsProps {
  styleOptions: TableChartStyle;
  onStyleChange: (newStyle: Partial<TableChartStyle>) => void;
  numericalColumns?: VisColumn[];
}

export const TableColumnUnitOptions: React.FC<TableColumnUnitOptionsProps> = ({
  styleOptions,
  onStyleChange,
  numericalColumns = [],
}) => {
  const currentColumnUnits: ColumnUnitConfig[] = useMemo(
    () => styleOptions.columnUnits || [],
    [styleOptions.columnUnits]
  );

  const updateColumnUnit = useCallback(
    (index: number, update: Partial<ColumnUnitConfig>) => {
      const newColumnUnits = [...currentColumnUnits];
      newColumnUnits[index] = { ...newColumnUnits[index], ...update };
      onStyleChange({ columnUnits: newColumnUnits });
    },
    [currentColumnUnits, onStyleChange]
  );

  const handleRemoveColumnUnit = useCallback(
    (index: number) => {
      onStyleChange({ columnUnits: currentColumnUnits.filter((_, i) => i !== index) });
    },
    [currentColumnUnits, onStyleChange]
  );

  const handleAddColumnUnit = useCallback(() => {
    onStyleChange({ columnUnits: [...currentColumnUnits, { field: '' }] });
  }, [currentColumnUnits, onStyleChange]);

  const getFieldOptions = (index: number) => {
    const otherSelectedFields = currentColumnUnits
      .filter((_, i) => i !== index)
      .map((cu) => cu.field)
      .filter((field) => field !== '');

    return [
      {
        value: '',
        text: i18n.translate('explore.stylePanel.table.columnUnits.selectField', {
          defaultMessage: 'Select a field',
        }),
      },
      ...numericalColumns
        .filter((col) => !otherSelectedFields.includes(col.column))
        .map((col) => ({ value: col.column, text: col.name || col.column })),
    ];
  };

  const selectedFieldCount = currentColumnUnits.filter((cu) => cu.field !== '').length;

  return (
    <StyleAccordion
      id="columnUnitsSection"
      accordionLabel={i18n.translate('explore.stylePanel.table.columnUnits', {
        defaultMessage: 'Column units',
      })}
      initialIsOpen={currentColumnUnits.length > 0}
    >
      {currentColumnUnits.map((cu, index) => (
        <EuiFlexGroup
          key={index}
          direction="column"
          gutterSize="none"
          data-test-subj={`visTableColumnUnit${index}`}
        >
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('explore.stylePanel.table.columnUnits.field', {
                defaultMessage: 'Field',
              })}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiSelect
                    compressed
                    options={getFieldOptions(index)}
                    value={cu.field}
                    onChange={(e) => {
                      const isValidField = numericalColumns.some(
                        (col) => col.column === e.target.value
                      );
                      updateColumnUnit(index, { field: isValidField ? e.target.value : '' });
                    }}
                    onMouseUp={(e) => e.stopPropagation()}
                    data-test-subj={`visTableColumnUnitField${index}`}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    onClick={() => handleRemoveColumnUnit(index)}
                    aria-label={i18n.translate('explore.stylePanel.table.columnUnits.remove', {
                      defaultMessage: 'Remove column unit',
                    })}
                    data-test-subj={`visTableRemoveColumnUnit${index}`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <UnitPanel
              unit={cu.unitId}
              onUnitChange={(unitId) => updateColumnUnit(index, { unitId })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
      {numericalColumns.length > selectedFieldCount && (
        <EuiFormRow>
          <EuiButton size="s" onClick={handleAddColumnUnit} data-test-subj="visTableAddColumnUnit">
            {i18n.translate('explore.stylePanel.table.columnUnits.add', {
              defaultMessage: 'Add column unit',
            })}
          </EuiButton>
        </EuiFormRow>
      )}
    </StyleAccordion>
  );
};
