/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { extractDataLinkReferences, injectDataLinkReferences } from './data_link_references';

const indexRef = {
  name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
  type: 'index-pattern',
  id: 'logs',
};

const visualization = (dataLinks: unknown[]) =>
  JSON.stringify({ title: '', chartType: 'table', params: { pageSize: 10, dataLinks } });

const urlLink = {
  id: 'a',
  title: 'Docs',
  url: 'https://example.com',
  openInNewTab: true,
  fields: ['x'],
};
const dashboardLink = {
  id: 'b',
  title: 'Open endpoint',
  url: "?_a=(variables:!((id:endpoint,current:!('${__value.text}'))))",
  openInNewTab: false,
  fields: ['Endpoint'],
  dashboardId: 'endpoint-dashboard',
};

describe('extractDataLinkReferences', () => {
  it('moves dashboard ids into references and keeps existing references', () => {
    const { attributes, references } = extractDataLinkReferences({
      attributes: { title: 't', visualization: visualization([urlLink, dashboardLink]) },
      references: [indexRef],
    });

    expect(references).toEqual([
      indexRef,
      { name: 'data_link_0', type: 'dashboard', id: 'endpoint-dashboard' },
    ]);
    const saved = JSON.parse(attributes.visualization as string);
    expect(saved.params.pageSize).toBe(10);
    expect(saved.params.dataLinks[0]).toEqual(urlLink);
    expect(saved.params.dataLinks[1]).not.toHaveProperty('dashboardId');
    expect(saved.params.dataLinks[1].dashboardRefName).toBe('data_link_0');
  });

  it('numbers references in link order', () => {
    const { references } = extractDataLinkReferences({
      attributes: {
        visualization: visualization([
          dashboardLink,
          { ...dashboardLink, id: 'c', dashboardId: 'function-dashboard' },
        ]),
      },
      references: [],
    });

    expect(references.map((r) => [r.name, r.id])).toEqual([
      ['data_link_0', 'endpoint-dashboard'],
      ['data_link_1', 'function-dashboard'],
    ]);
  });

  it('returns the input unchanged without dashboard links', () => {
    const attributes = { visualization: visualization([urlLink]) };
    expect(extractDataLinkReferences({ attributes, references: [indexRef] })).toEqual({
      attributes,
      references: [indexRef],
    });
  });

  it('ignores an empty or invalid visualization', () => {
    for (const vis of ['', '{not json', undefined]) {
      const attributes = { visualization: vis };
      expect(extractDataLinkReferences({ attributes, references: [] }).attributes).toBe(attributes);
    }
  });
});

describe('injectDataLinkReferences', () => {
  it('restores dashboard ids from references, including remapped ids', () => {
    const saved = extractDataLinkReferences({
      attributes: { visualization: visualization([urlLink, dashboardLink]) },
      references: [indexRef],
    });
    // Import with new copies or an integration install gives the dashboard a new id.
    const remapped = saved.references.map((ref) =>
      ref.type === 'dashboard' ? { ...ref, id: 'new-id' } : ref
    );
    const savedObject = { visualization: saved.attributes.visualization };

    injectDataLinkReferences(savedObject, remapped);

    const links = JSON.parse(savedObject.visualization as string).params.dataLinks;
    expect(links[0]).toEqual(urlLink);
    expect(links[1]).toEqual({ ...dashboardLink, dashboardId: 'new-id' });
  });

  it('keeps the reference name when the reference is missing', () => {
    const savedObject = {
      visualization: visualization([{ ...urlLink, dashboardRefName: 'data_link_0' }]),
    };

    injectDataLinkReferences(savedObject, [indexRef]);

    const [link] = JSON.parse(savedObject.visualization).params.dataLinks;
    expect(link.dashboardRefName).toBe('data_link_0');
    expect(link).not.toHaveProperty('dashboardId');
  });

  it('leaves the visualization untouched without dashboard links', () => {
    const savedObject = { visualization: visualization([urlLink]) };
    const before = savedObject.visualization;
    injectDataLinkReferences(savedObject, [indexRef]);
    expect(savedObject.visualization).toBe(before);
  });
});
