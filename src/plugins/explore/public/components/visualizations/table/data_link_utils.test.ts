/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import rison from 'rison-node';
import { parse as parseUrl } from 'url';
import { resolveDataLinkUrl, DataLinkVariable } from './data_link_utils';

/**
 * Same two steps the dashboard uses to read _a: url.parse on the hash
 * (querystring decode), then rison.decode. See parseUrlHash and decodeState.
 */
const readDashboardState = (href: string) => {
  const absolute = href.startsWith('#') ? `http://localhost/app/dashboards${href}` : href;
  const hash = parseUrl(absolute, true).hash ?? '';
  const query = parseUrl(hash.slice(1), true).query;
  return rison.decode(String(query._a));
};

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

  it('percent-encodes when there is no :rison suffix', () => {
    expect(resolveDataLinkUrl('?v=${__value.text}', "o'brien /x")).toBe("?v=o'brien%20%2Fx");
    expect(resolveDataLinkUrl('?v=${__value.text:uri}', '/api/orders')).toBe(
      '?v=${__value.text:uri}'
    );
  });

  it('rison-encodes a :rison suffix without percent-encoding the value', () => {
    expect(resolveDataLinkUrl('current:!(${__value.text:rison})', '/api/orders')).toBe(
      'current:!(/api/orders)'
    );
    expect(resolveDataLinkUrl('${__value.text:rison}', 'foo bar')).toBe("'foo+bar'");
    expect(resolveDataLinkUrl('${__value.text:rison}', "o'brien")).toBe("'o!'brien'");
    expect(resolveDataLinkUrl('${__value.text:rison}', 'a!b')).toBe("'a!!b'");
    expect(resolveDataLinkUrl('?p=${__data.fields["request path"]:rison}', 'x', row)).toBe(
      '?p=/api/orders'
    );
    expect(resolveDataLinkUrl('?s=${__data.fields.resource.service.name:rison}', 'x', row)).toBe(
      '?s=cart'
    );
    expect(resolveDataLinkUrl('?e=$env:rison', 'x', {}, variables)).toBe('?e=prod');
  });

  it('rison-encodes a multi-value variable as one array', () => {
    expect(resolveDataLinkUrl('current:${regions:rison}', 'x', {}, variables)).toBe(
      "current:!('eu+west',us)"
    );
  });

  it('leaves an unknown suffix in place', () => {
    expect(resolveDataLinkUrl('?e=${env:raw}', 'x', {}, variables)).toBe('?e=${env:raw}');
    expect(resolveDataLinkUrl('?m=${__data.fields.missing:rison}', 'x', row)).toBe(
      '?m=${__data.fields.missing:rison}'
    );
  });

  it('does not expand a rison value that itself contains a placeholder', () => {
    expect(resolveDataLinkUrl('?v=${__value.text:rison}&e=$env', '$env', {}, variables)).toBe(
      "?v='$env'&e=prod"
    );
  });

  it('round-trips a dashboard link through the URL parser and rison.decode', () => {
    const href = resolveDataLinkUrl(
      '#/view/endpoint-dashboard?_a=(variables:!((id:service,current:!(${service:rison})),(id:endpoint,current:!(${__value.text:rison}))))',
      '/api/orders',
      {},
      [{ name: 'service', value: "o'brien" }]
    );

    expect(readDashboardState(href)).toEqual({
      variables: [
        { id: 'service', current: ["o'brien"] },
        { id: 'endpoint', current: ['/api/orders'] },
      ],
    });
  });

  it('round-trips spaces, reserved characters, and a multi-value variable', () => {
    const href = resolveDataLinkUrl(
      '#/view/endpoint-dashboard?_a=(variables:!((id:service,current:!(${service:rison})),(id:path,current:!(${__data.fields["request path"]:rison})),(id:regions,current:${regions:rison})))',
      'x',
      { 'request path': 'a&b#c+d 100%' },
      [
        { name: 'service', value: 'foo bar' },
        { name: 'regions', value: 'eu,us', multi: true, values: ['eu west', "o'brien"] },
      ]
    );

    expect(readDashboardState(href)).toEqual({
      variables: [
        { id: 'service', current: ['foo bar'] },
        { id: 'path', current: ['a&b#c+d 100%'] },
        { id: 'regions', current: ['eu west', "o'brien"] },
      ],
    });
  });
});
