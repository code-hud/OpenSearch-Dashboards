/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

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
const PLACEHOLDER =
  /\$\{__value\.text\}|\$\{__data\.fields(?:\.([^}[\]"']+)|\[\s*"([^"]*)"\s*\]|\[\s*'([^']*)'\s*\])\}|\$\{(\w+)\}|\$(\w+)/g;

const encode = (value: unknown): string =>
  encodeURIComponent(
    value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
  );

/**
 * Resolves the placeholders of a table data link URL in one pass, so a
 * substituted value is never expanded again. Each value is URL-encoded.
 * Placeholders for missing fields or unknown variables stay as they are.
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
      dotField?: string,
      doubleQuotedField?: string,
      singleQuotedField?: string,
      bracedVariable?: string,
      simpleVariable?: string
    ) => {
      if (match === '${__value.text}') {
        return encode(value);
      }
      const field = dotField ?? doubleQuotedField ?? singleQuotedField;
      if (field !== undefined) {
        return Object.prototype.hasOwnProperty.call(row, field) ? encode(row[field]) : match;
      }
      const variable = variables.find((v) => v.name === (bracedVariable ?? simpleVariable));
      if (!variable) {
        return match;
      }
      return variable.multi
        ? (variable.values ?? []).map(encode).join(',')
        : encode(variable.value);
    }
  );
