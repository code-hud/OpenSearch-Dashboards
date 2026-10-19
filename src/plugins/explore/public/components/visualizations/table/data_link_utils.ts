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
// Any of those may end with :rison. The suffix is not a capturing group.
const PLACEHOLDER =
  /\$\{__value\.text(?::rison)?\}|\$\{__data\.fields(?:\.([^}[\]"']+?)|\[\s*"([^"]*)"\s*\]|\[\s*'([^']*)'\s*\])(?::rison)?\}|\$\{(\w+)(?::rison)?\}|\$(\w+)(?::rison)?/g;

const textOf = (value: unknown): string =>
  value === null || value === undefined
    ? ''
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

/** :rison uses rison.encode_uri. Everything else is a percent-encoded query value. */
const encode = (value: unknown, asRison: boolean): string =>
  asRison ? rison.encode_uri(textOf(value)) : encodeURIComponent(textOf(value));

const endsWithRison = (match: string) => match.endsWith(':rison}') || match.endsWith(':rison');

/**
 * Resolves the placeholders of a table data link URL in one pass, so a
 * substituted value is never expanded again. Placeholders for missing fields
 * or unknown variables stay as they are.
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
      const asRison = endsWithRison(match);
      if (match.startsWith('${__value.text')) {
        return encode(value, asRison);
      }
      const field = dotField ?? doubleQuotedField ?? singleQuotedField;
      if (field !== undefined) {
        return Object.prototype.hasOwnProperty.call(row, field)
          ? encode(row[field], asRison)
          : match;
      }
      const variable = variables.find((v) => v.name === (bracedVariable ?? simpleVariable));
      if (!variable) {
        return match;
      }
      if (variable.multi) {
        const values = variable.values ?? [];
        return asRison
          ? rison.encode_uri(values)
          : values.map((item) => encodeURIComponent(item)).join(',');
      }
      return encode(variable.value, asRison);
    }
  );
