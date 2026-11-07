import test from 'node:test';
import assert from 'node:assert/strict';
import { managementLink, parseManagementLink, migrationLink, pageLink, parseMigrationLink } from '../src/order-access.js';
const id = '3d44a8a9-1ebf-4c49-8a39-63c30c365060', token = 'b'.repeat(64);

test('management access stays in the URL fragment and round-trips to the intended order', () => {
  const url = new URL(managementLink('https://orders.example/path?from=group', id, token));
  assert.equal(url.origin, 'https://orders.example');
  assert.equal(url.pathname, '/path');
  assert.equal(url.search, '');
  assert.deepEqual(parseManagementLink(url.hash), { id, token });
  const request = new Request(url);
  assert.equal(new URL(request.url).search, '');
  assert.ok(!new URL(url.origin + url.pathname + url.search).href.includes(token));
});

test('group and management links retain a GitHub Pages project path without query or secret fragments', () => {
  const address = 'https://someone.github.io/bonice-group/index.html?from=old#private';
  assert.equal(pageLink(address), 'https://someone.github.io/bonice-group/');
  const url = new URL(managementLink(address, id, token));
  assert.equal(url.pathname, '/bonice-group/');
  assert.deepEqual(parseManagementLink(url.hash), { id, token });
  assert.equal(pageLink('https://someone.github.io/'), 'https://someone.github.io/');
});

test('existing owners can transfer multiple private access keys to the new site without sending them as request parameters', () => {
  const entries = [{ id, token }, { id: '51174fea-4cf5-4a2b-a7d5-8b31770054cd', token: 'c'.repeat(64) }];
  const url = new URL(migrationLink('https://someone.github.io/bonice-group/', entries));
  assert.deepEqual(parseMigrationLink(url.hash), entries);
  assert.equal(url.search, '');
  assert.equal(migrationLink(url, []), 'https://someone.github.io/bonice-group/');
  for (const fragment of ['#orders=', '#orders=' + id + '.short', url.hash + ',invalid', '#orders=' + Array(101).fill(id + '.' + token).join(',')]) assert.equal(parseMigrationLink(fragment), null);
  assert.throws(() => migrationLink('https://someone.github.io/', [{ id, token: 'invalid' }]));
});

test('unrelated, incomplete and malformed fragments cannot import order access', () => {
  for (const value of ['', '#', '#orders', '#order=' + id, '#order=' + id + '.short', '#order=' + id + '.' + token + '&other=1', '#order=not-an-id.' + token, null]) {
    assert.equal(parseManagementLink(value), null);
  }
  assert.throws(() => managementLink('javascript:alert(1)', id, token));
  assert.throws(() => managementLink('https://orders.example', id, 'wrong'));
});
