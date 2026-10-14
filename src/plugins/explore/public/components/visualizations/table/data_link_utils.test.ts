/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolveDataLinkUrl, DataLinkVariable } from './data_link_utils';

describe('resolveDataLinkUrl', () => {
  const row = {
    service: 'checkout',
    'request path': '/api/orders',
    'resource.service.name': 'cart',
    empty: null,
    nested: { a: 1 },
  };
  const variables: DataLinkVariable[] = [
    { name: 'env', value: 'prod' },
    { name: 'regions', value: 'eu,us', multi: true, values: ['eu west', 'us'] },
  ];

  it('replaces the clicked value', () => {
    expect(resolveDataLinkUrl('https://x?q=${__value.text}', 'a b')).toBe('https://x?q=a%20b');
  });

  it('replaces every occurrence, not only the first', () => {
    expect(resolveDataLinkUrl('/${__value.text}/${__value.text}', 'v')).toBe('/v/v');
  });

  it('replaces a row field with dot syntax', () => {
    expect(resolveDataLinkUrl('?s=${__data.fields.service}', 'x', row)).toBe('?s=checkout');
  });

  it('replaces a row field whose name contains dots', () => {
    expect(resolveDataLinkUrl('?s=${__data.fields.resource.service.name}', 'x', row)).toBe(
      '?s=cart'
    );
  });

  it('replaces a row field with bracket syntax, double or single quotes', () => {
    expect(resolveDataLinkUrl('?p=${__data.fields["request path"]}', 'x', row)).toBe(
      '?p=%2Fapi%2Forders'
    );
    expect(resolveDataLinkUrl("?p=${__data.fields['request path']}", 'x', row)).toBe(
      '?p=%2Fapi%2Forders'
    );
  });

  it('keeps the placeholder for a field that is not in the row', () => {
    expect(resolveDataLinkUrl('?m=${__data.fields.missing}', 'x', row)).toBe(
      '?m=${__data.fields.missing}'
    );
  });

  it('gives an empty string for a null field and stringifies objects', () => {
    expect(resolveDataLinkUrl('?e=${__data.fields.empty}', 'x', row)).toBe('?e=');
    expect(resolveDataLinkUrl('?n=${__data.fields.nested}', 'x', row)).toBe(
      `?n=${encodeURIComponent('{"a":1}')}`
    );
    expect(resolveDataLinkUrl('?v=${__value.text}', { b: 2 })).toBe(
      `?v=${encodeURIComponent('{"b":2}')}`
    );
  });

  it('replaces dashboard variables in both forms', () => {
    expect(resolveDataLinkUrl('?e=$env&f=${env}', 'x', {}, variables)).toBe('?e=prod&f=prod');
  });

  it('joins the values of a multi-value variable, each encoded', () => {
    expect(resolveDataLinkUrl('?r=$regions', 'x', {}, variables)).toBe('?r=eu%20west,us');
  });

  it('keeps an unknown variable, and $var when there are no variables', () => {
    expect(resolveDataLinkUrl('?u=$unknown', 'x', {}, variables)).toBe('?u=$unknown');
    expect(resolveDataLinkUrl('?e=$env', 'x')).toBe('?e=$env');
  });

  it('does not expand placeholders inside substituted values', () => {
    expect(
      resolveDataLinkUrl('?v=${__value.text}&e=$env', '$env ${__value.text}', {}, variables)
    ).toBe(`?v=${encodeURIComponent('$env ${__value.text}')}&e=prod`);
  });

  it('encodes reserved characters', () => {
    expect(resolveDataLinkUrl('?v=${__value.text}', 'a&b#c/d e')).toBe('?v=a%26b%23c%2Fd%20e');
  });

  it('keeps a URL without placeholders unchanged', () => {
    expect(resolveDataLinkUrl('https://example.com/a?b=c', 'x', row, variables)).toBe(
      'https://example.com/a?b=c'
    );
  });
});
