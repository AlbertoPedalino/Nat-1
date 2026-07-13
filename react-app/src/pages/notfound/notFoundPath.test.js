import test from 'node:test';
import assert from 'node:assert/strict';
import { composeMissingPath } from './notFoundPath.js';

test('composes a normal missing path', () => {
  assert.equal(
    composeMissingPath({ pathname: '/lost-road', search: '', hash: '' }),
    '/lost-road',
  );
});

test('preserves query and hash segments', () => {
  assert.equal(
    composeMissingPath({ pathname: '/lost-road', search: '?from=keep', hash: '#camp' }),
    '/lost-road?from=keep#camp',
  );
});

test('preserves long and encoded paths without normalization', () => {
  const pathname = `/${'forgotten-trail/'.repeat(12)}%E2%9A%94%EF%B8%8F`;

  assert.equal(
    composeMissingPath({ pathname, search: '?map=deep%20wilds', hash: '#dead-end' }),
    `${pathname}?map=deep%20wilds#dead-end`,
  );
});
