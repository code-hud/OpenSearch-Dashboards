/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { UnitPanel } from './unit_panel';

const mockOnUnitChange = jest.fn();

describe('UnitPanel', () => {
  beforeEach(() => {
    mockOnUnitChange.mockClear();
  });

  it('renders with placeholder when no unit selected', () => {
    render(<UnitPanel onUnitChange={mockOnUnitChange} />);
    expect(screen.getByPlaceholderText('Select a unit')).toBeInTheDocument();
  });

  it('displays selected unit name', () => {
    render(<UnitPanel unit="number" onUnitChange={mockOnUnitChange} />);
    expect(screen.getByDisplayValue('Number')).toBeInTheDocument();
  });

  it('shows trash icon when unit is selected', () => {
    render(<UnitPanel unit="number" onUnitChange={mockOnUnitChange} />);
    expect(screen.getByTestId('clearUnitButton')).toBeInTheDocument();
  });

  it('shows arrow icon when no unit selected', () => {
    render(<UnitPanel onUnitChange={mockOnUnitChange} />);
    expect(screen.getByTestId('openMenuButton')).toBeInTheDocument();
  });

  it('opens popover when input is clicked', () => {
    render(<UnitPanel onUnitChange={mockOnUnitChange} />);
    fireEvent.click(screen.getByPlaceholderText('Select a unit'));
    expect(screen.getByTestId('unitPanelContextMenu')).toBeInTheDocument();
  });

  it('should show all unit category', () => {
    render(<UnitPanel onUnitChange={mockOnUnitChange} />);
    fireEvent.click(screen.getByPlaceholderText('Select a unit'));
    expect(screen.getByText('Misc')).toBeInTheDocument();
    expect(screen.getByText('Acceleration')).toBeInTheDocument();
    expect(screen.getByText('Angle')).toBeInTheDocument();
    expect(screen.getByText('Area')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Date & time')).toBeInTheDocument();
    expect(screen.getByText('Mass')).toBeInTheDocument();
    expect(screen.getByText('Length')).toBeInTheDocument();
  });

  it('calls onUnitChange with undefined when trash icon clicked', () => {
    render(<UnitPanel unit="number" onUnitChange={mockOnUnitChange} />);
    fireEvent.click(screen.getByTestId('clearUnitButton'));
    expect(mockOnUnitChange).toHaveBeenCalledWith(undefined);
  });

  it('shows the short labels switch for time units', () => {
    const onShortLabelsChange = jest.fn();
    render(
      <UnitPanel
        unit="millisecond"
        onUnitChange={mockOnUnitChange}
        onShortLabelsChange={onShortLabelsChange}
      />
    );
    const toggle = screen.getByTestId('unitShortLabelsSwitch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(onShortLabelsChange).toHaveBeenCalledWith(true);
  });

  it('reflects the enabled short labels state', () => {
    render(
      <UnitPanel
        unit="second"
        onUnitChange={mockOnUnitChange}
        shortLabels={true}
        onShortLabelsChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('unitShortLabelsSwitch')).toHaveAttribute('aria-checked', 'true');
  });

  it('hides the short labels switch for units without short labels', () => {
    render(
      <UnitPanel unit="bytes" onUnitChange={mockOnUnitChange} onShortLabelsChange={jest.fn()} />
    );
    expect(screen.queryByTestId('unitShortLabelsSwitch')).not.toBeInTheDocument();
  });

  it('hides the short labels switch when no change handler is given', () => {
    render(<UnitPanel unit="millisecond" onUnitChange={mockOnUnitChange} />);
    expect(screen.queryByTestId('unitShortLabelsSwitch')).not.toBeInTheDocument();
  });

  it('displays unit categories in context menu', () => {
    render(<UnitPanel onUnitChange={mockOnUnitChange} />);
    fireEvent.click(screen.getByPlaceholderText('Select a unit'));
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('Misc')).toBeInTheDocument();
  });
});
