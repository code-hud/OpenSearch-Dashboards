/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataLinkOptions, DataLink, DataLinkModal } from './data_link_options';
import { VisColumn, VisFieldType } from '../types';

const mockFind = jest.fn().mockResolvedValue({
  savedObjects: [{ id: 'endpoint-dashboard', attributes: { title: 'Endpoint' } }],
});
const mockGet = jest
  .fn()
  .mockResolvedValue({ id: 'endpoint-dashboard', attributes: { title: 'Endpoint' } });
jest.mock('../../../application/legacy/discover/opensearch_dashboards_services', () => ({
  getServices: () => ({
    core: { savedObjects: { client: { find: mockFind, get: mockGet } } },
  }),
}));

const numericalColumns: VisColumn[] = [
  {
    id: 1,
    column: 'num1',
    name: 'Num1',
    schema: VisFieldType.Numerical,
  },
];

const categoricalColumns: VisColumn[] = [
  {
    id: 2,
    column: 'cat1',
    name: 'Cat1',
    schema: VisFieldType.Categorical,
  },
];

const dateColumns: VisColumn[] = [
  {
    id: 3,
    column: 'date1',
    name: 'Date1',
    schema: VisFieldType.Date,
  },
];

describe('DataLinkModal', () => {
  it('disables save if required fields missing', () => {
    const handleSave = jest.fn();
    const handleCancel = jest.fn();

    render(
      <DataLinkModal
        onSave={handleSave}
        onCancel={handleCancel}
        availableFields={[{ label: 'Num1', value: 'num1' }]}
      />
    );

    const saveBtn = screen.getByTestId('dataLinkSaveButton');
    expect(saveBtn).toBeDisabled();
  });

  it('lists the supported placeholders in the URL help text', () => {
    render(
      <DataLinkModal
        onSave={jest.fn()}
        onCancel={jest.fn()}
        availableFields={[{ label: 'Num1', value: 'num1' }]}
      />
    );

    expect(screen.getByText(/__data\.fields\.name/)).toBeInTheDocument();
    expect(screen.getByText(/\$variable/)).toBeInTheDocument();
    expect(screen.getByText(/:rison/)).toBeInTheDocument();
  });

  it('saves link with valid input', async () => {
    const handleSave = jest.fn();

    render(
      <DataLinkModal
        onSave={handleSave}
        onCancel={jest.fn()}
        availableFields={[{ label: 'Num1', value: 'num1' }]}
      />
    );

    // Enter title
    fireEvent.change(screen.getByTestId('dataLinkTitleInput'), {
      target: { value: 'My Link' },
    });

    // Enter URL
    fireEvent.change(screen.getByTestId('dataLinkUrlInput'), {
      target: { value: 'http://example.com/${__value.text}' },
    });

    // Open the popover to select a field
    fireEvent.click(screen.getByTestId('dataLinkAddFieldButton'));

    // Select the "Num1" field from the context menu
    fireEvent.click(await screen.findByTestId('dataLinkFieldOption-num1'));

    // Set openInNewTab to false by triggering the onChange event
    const switchInput = screen.getByTestId('dataLinkNewTabSwitch').querySelector('input');
    if (switchInput) {
      fireEvent.change(switchInput, { target: { checked: false } }); // Directly trigger onChange
    }

    // Verify the save button is enabled
    const saveBtn = await screen.findByTestId('dataLinkSaveButton');
    await waitFor(() => expect(saveBtn).not.toBeDisabled());

    // Click save
    fireEvent.click(saveBtn);

    // Verify that handleSave was called with the correct data
    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Link',
          url: 'http://example.com/${__value.text}',
          fields: ['num1'],
          openInNewTab: true,
        })
      );
    });
  });

  it('saves a dashboard link with the selected dashboard id', async () => {
    const handleSave = jest.fn();
    render(
      <DataLinkModal
        onSave={handleSave}
        onCancel={jest.fn()}
        availableFields={[{ label: 'Num1', value: 'num1' }]}
      />
    );

    fireEvent.change(screen.getByTestId('dataLinkTitleInput'), {
      target: { value: 'Open endpoint' },
    });
    fireEvent.click(screen.getByTestId('dataLinkAddFieldButton'));
    fireEvent.click(await screen.findByTestId('dataLinkFieldOption-num1'));
    fireEvent.click(screen.getByText('Dashboard'));

    const select = await screen.findByTestId('dataLinkDashboardSelect');
    await waitFor(() =>
      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ type: 'dashboard' }))
    );
    expect(screen.getByTestId('dataLinkSaveButton')).toBeDisabled();

    fireEvent.focus(within(select).getByTestId('comboBoxSearchInput'));
    fireEvent.click(await screen.findByText('Endpoint'));
    fireEvent.change(screen.getByTestId('dataLinkUrlInput'), {
      target: { value: '?_a=(variables:!())' },
    });

    const saveBtn = screen.getByTestId('dataLinkSaveButton');
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Open endpoint',
          url: '?_a=(variables:!())',
          dashboardId: 'endpoint-dashboard',
        })
      )
    );
  });

  it('shows the title of the linked dashboard when editing', async () => {
    render(
      <DataLinkModal
        link={{
          id: '1',
          title: 'Open endpoint',
          url: '',
          openInNewTab: false,
          fields: ['num1'],
          dashboardId: 'endpoint-dashboard',
        }}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        availableFields={[{ label: 'Num1', value: 'num1' }]}
      />
    );

    expect(mockGet).toHaveBeenCalledWith('dashboard', 'endpoint-dashboard');
    const select = screen.getByTestId('dataLinkDashboardSelect');
    await waitFor(() => expect(within(select).getByText('Endpoint')).toBeInTheDocument());
    expect(screen.getByTestId('dataLinkSaveButton')).not.toBeDisabled();
  });
});

describe('DataLinkOptions', () => {
  it('renders Add Link button and opens modal', () => {
    const handleChange = jest.fn();
    render(
      <DataLinkOptions
        // @ts-expect-error TS2740 TODO(ts-error): fixme
        styleOptions={{ dataLinks: [] }}
        onStyleChange={handleChange}
        numericalColumns={numericalColumns}
        categoricalColumns={categoricalColumns}
        dateColumns={dateColumns}
        axisColumnMappings={{}}
        updateVisualization={jest.fn()}
      />
    );

    const addBtn = screen.getByTestId('addDataLinkButton');
    expect(addBtn).toBeInTheDocument();

    fireEvent.click(addBtn);

    expect(
      screen.getByText('Add link', { selector: '.euiModalHeader__title' })
    ).toBeInTheDocument();
  });

  it('renders existing links and allows delete', () => {
    const handleChange = jest.fn();
    const link: DataLink = {
      id: 'abc123',
      title: 'Test Link',
      url: 'http://example.com',
      openInNewTab: false,
      fields: ['num1'],
    };

    render(
      <DataLinkOptions
        // @ts-expect-error TS2740 TODO(ts-error): fixme
        styleOptions={{ dataLinks: [link] }}
        onStyleChange={handleChange}
        numericalColumns={numericalColumns}
        categoricalColumns={categoricalColumns}
        dateColumns={dateColumns}
        axisColumnMappings={{}}
        updateVisualization={jest.fn()}
      />
    );

    expect(screen.getByText('Test Link')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`deleteDataLink-${link.id}`));
    expect(handleChange).toHaveBeenCalledWith({ dataLinks: [] });
  });

  it('renders existing links and allows edit', () => {
    const handleChange = jest.fn();
    const link: DataLink = {
      id: 'abc123',
      title: 'Edit Me',
      url: 'http://example.com',
      openInNewTab: false,
      fields: ['num1'],
    };

    render(
      <DataLinkOptions
        // @ts-expect-error TS2740 TODO(ts-error): fixme
        styleOptions={{ dataLinks: [link] }}
        onStyleChange={handleChange}
        numericalColumns={numericalColumns}
        categoricalColumns={categoricalColumns}
        dateColumns={dateColumns}
        axisColumnMappings={{}}
        updateVisualization={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId(`editDataLink-${link.id}`));
    expect(screen.getByText('Edit Link')).toBeInTheDocument();
  });
});
