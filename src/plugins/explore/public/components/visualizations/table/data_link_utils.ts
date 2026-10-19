/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import rison from 'rison-node';

/**
 * A dashboard variable as a data link sees it. Structurally compatible with
 * VariableValue from the dashboard plugin.
 */
export interface DataLinkVariable {
  name: string;
  value: string;
  multi?: boolean;
  values?: string[];
}

// ${__value.text} | ${__data.fields.<name>} | ${__data.fields["<name>"]} |
// ${__data.fields['<name>']} | ${<variable>} | $<variable>
// An optional :uri (the default) or :rison suffix selects the encoding.
const FORMAT = '(?::(rison|uri))?';
const PLACEHOLDER = new RegExp(
  [
    `\\$\\{__value\\.text${FORMAT}\\}`,
    `\\$\\{__data\\.fields(?:\\.([^}[\\]"']+?)|\\[\\s*"([^"]*)"\\s*\\]|\\[\\s*'([^']*)'\\s*\\])${FORMAT}\\}`,
    `\\$\\{(\\w+)${FORMAT}\\}`,
    `\\$(\\w+)${FORMAT}`,
  ].join('|'),
  'g'
);

const textOf = (value: unknown): string =>
  value === null || value === undefined
    ? ''
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

/**
 * :uri percent-encodes a query parameter. :rison uses rison.encode_uri, the
 * form a dashboard hash keeps after its query parser runs.
 */
const applyFormat = (value: unknown, format?: string): string => {
  const text = textOf(value);
  return format === 'rison' ? rison.encode_uri(text) : encodeURIComponent(text);
};

/**
 * Resolves the placeholders of a table data link URL in one pass, so a
 * substituted value is never expanded again. The default encoding is
 * percent-encoding. A :rison suffix encodes for a dashboard _a link.
 * Placeholders for missing fields, unknown variables, or an unknown suffix
 * stay as they are.
 */
export const resolveDataLinkUrl = (
  url: string,
  value: unknown,
  row: Record<string, unknown> = {},
  variables: DataLinkVariable[] = []
): string =>
  url.replace(
    PLACEHOLDER,
    (
      match: string,
      valueFormat?: string,
      dotField?: string,
      doubleQuotedField?: string,
      singleQuotedField?: string,
      fieldFormat?: string,
      bracedVariable?: string,
      bracedFormat?: string,
      simpleVariable?: string,
      simpleFormat?: string
    ) => {
      // The closing } is not part of the prefix: a :rison suffix sits before it.
      if (match.startsWith('${__value.text')) {
        return applyFormat(value, valueFormat);
      }
      const field = dotField ?? doubleQuotedField ?? singleQuotedField;
      if (field !== undefined) {
        return Object.prototype.hasOwnProperty.call(row, field)
          ? applyFormat(row[field], fieldFormat)
          : match;
      }
      const variable = variables.find((v) => v.name === (bracedVariable ?? simpleVariable));
      if (!variable) {
        return match;
      }
      const format = bracedFormat ?? simpleFormat;
      if (variable.multi) {
        const values = variable.values ?? [];
        return format === 'rison'
          ? rison.encode_uri(values)
          : values.map((item) => encodeURIComponent(item)).join(',');
      }
      return applyFormat(variable.value, format);
    }
  );
