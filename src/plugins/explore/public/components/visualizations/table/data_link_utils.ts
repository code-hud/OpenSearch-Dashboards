/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import rison from 'rison-node';
import type { VariableValue } from '../../../../../dashboard/public';

/**
 * Placeholder grammar, compatible with Grafana data links:
 *
 *   ${__value.text}                 the clicked cell value
 *   ${__data.fields.<name>}         a field of the same row; <name> may contain dots
 *   ${__data.fields["<name>"]}      the same, for names with spaces or other characters
 *   ${__data.fields['<name>']}
 *   ${<variable>}  or  $<variable>  a dashboard variable
 *
 * A `:rison` format suffix may follow the body of any placeholder, for example
 * ${__value.text:rison} or $<variable>:rison. Field names containing `}` are
 * not supported.
 */

/** Outer form: a braced body, or a bare variable with an optional format. */
const PLACEHOLDER = /\$\{([^}]+)\}|\$(\w+)(:rison)?/g;

/** Braced bodies. Each one captures the format suffix as its last group. */
const CLICKED_VALUE = /^__value\.text(:rison)?$/;
const ROW_FIELD = /^__data\.fields(?:\.(.+?)|\[\s*"([^"]*)"\s*\]|\[\s*'([^']*)'\s*\])(:rison)?$/;
const VARIABLE = /^(\w+)(:rison)?$/;

const RISON = ':rison';

/** The text a table cell shows for a value. Data links carry the same text. */
export const cellValueText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

/** :rison uses rison.encode_uri. Everything else is a percent-encoded query value. */
const encode = (value: unknown, asRison: boolean): string =>
  asRison ? rison.encode_uri(cellValueText(value)) : encodeURIComponent(cellValueText(value));

/** Returns undefined for an unknown variable, so the placeholder is kept. */
const resolveVariable = (
  name: string,
  asRison: boolean,
  variables: VariableValue[]
): string | undefined => {
  const variable = variables.find((v) => v.name === name);
  if (!variable) {
    return undefined;
  }
  if (variable.multi) {
    const values = variable.values ?? [];
    return asRison
      ? rison.encode_uri(values)
      : values.map((item) => encodeURIComponent(item)).join(',');
  }
  return encode(variable.value, asRison);
};

/** Returns undefined for an unknown body, field or variable, so the placeholder is kept. */
const resolveBraced = (
  body: string,
  value: unknown,
  row: Record<string, unknown>,
  variables: VariableValue[]
): string | undefined => {
  const clicked = CLICKED_VALUE.exec(body);
  if (clicked) {
    return encode(value, clicked[1] === RISON);
  }
  const field = ROW_FIELD.exec(body);
  if (field) {
    const name = field[1] ?? field[2] ?? field[3];
    return Object.prototype.hasOwnProperty.call(row, name)
      ? encode(row[name], field[4] === RISON)
      : undefined;
  }
  const variable = VARIABLE.exec(body);
  if (variable) {
    return resolveVariable(variable[1], variable[2] === RISON, variables);
  }
  return undefined;
};

/**
 * Resolves the placeholders of a table data link URL in one pass, so a
 * substituted value is never expanded again. Placeholders for missing fields,
 * unknown variables or unknown suffixes stay as they are.
 */
export const resolveDataLinkUrl = (
  url: string,
  value: unknown,
  row: Record<string, unknown> = {},
  variables: VariableValue[] = []
): string =>
  url.replace(
    PLACEHOLDER,
    (match: string, braced?: string, bareVariable?: string, bareFormat?: string) => {
      const resolved =
        braced !== undefined
          ? resolveBraced(braced, value, row, variables)
          : resolveVariable(bareVariable as string, bareFormat === RISON, variables);
      return resolved ?? match;
    }
  );
