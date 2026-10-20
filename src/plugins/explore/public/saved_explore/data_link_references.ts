/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectAttributes, SavedObjectReference } from '../../../../core/public';
import type { DataLink } from '../components/visualizations/table/data_link_options';

const DASHBOARD_TYPE = 'dashboard';
const REF_NAME_PREFIX = 'data_link_';

interface VisualizationWithLinks {
  params?: { dataLinks?: DataLink[] };
}

const parseVisualization = (visualization: unknown): VisualizationWithLinks | undefined => {
  if (typeof visualization !== 'string' || !visualization) return undefined;
  try {
    const parsed = JSON.parse(visualization);
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Moves the target dashboard id of each dashboard data link into the saved
 * object's references, so that import with new copies, integration installs
 * and "export with related objects" keep the link pointing at its dashboard.
 */
export function extractDataLinkReferences({
  attributes,
  references = [],
}: {
  attributes: SavedObjectAttributes;
  references?: SavedObjectReference[];
}): { attributes: SavedObjectAttributes; references: SavedObjectReference[] } {
  const visualization = parseVisualization(attributes.visualization);
  const links = visualization?.params?.dataLinks;
  if (!visualization || !Array.isArray(links) || !links.some((link) => link.dashboardId)) {
    return { attributes, references };
  }

  const linkReferences: SavedObjectReference[] = [];
  const dataLinks = links.map((link) => {
    if (!link.dashboardId) return link;
    const { dashboardId, ...rest } = link;
    const name = `${REF_NAME_PREFIX}${linkReferences.length}`;
    linkReferences.push({ name, type: DASHBOARD_TYPE, id: dashboardId });
    return { ...rest, dashboardRefName: name };
  });

  return {
    attributes: {
      ...attributes,
      visualization: JSON.stringify({
        ...visualization,
        params: { ...visualization.params, dataLinks },
      }),
    },
    references: [...references, ...linkReferences],
  };
}

/**
 * Restores `dashboardId` on dashboard data links from the saved object's
 * references. A link whose reference is missing keeps its `dashboardRefName`
 * and no `dashboardId`, so it is not rendered.
 */
export function injectDataLinkReferences(
  savedObject: { visualization?: unknown },
  references: SavedObjectReference[]
): void {
  const visualization = parseVisualization(savedObject.visualization);
  const links = visualization?.params?.dataLinks;
  if (!visualization || !Array.isArray(links) || !links.some((link) => link.dashboardRefName)) {
    return;
  }

  const dataLinks = links.map((link) => {
    if (!link.dashboardRefName) return link;
    const reference = references.find(
      (ref) => ref.name === link.dashboardRefName && ref.type === DASHBOARD_TYPE
    );
    if (!reference) return link;
    const { dashboardRefName, ...rest } = link;
    return { ...rest, dashboardId: reference.id };
  });

  savedObject.visualization = JSON.stringify({
    ...visualization,
    params: { ...visualization.params, dataLinks },
  });
}
