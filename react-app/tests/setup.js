import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { syncDigest } from './ui/support/syncDigest.js';

// jsdom keeps mounted trees between tests otherwise, so a query would match a
// component left over from an earlier case.
afterEach(cleanup);

// The recovery's database read never leaves a test (tests/ui/support/syncDigest.js).
vi.mock('../src/shared/cloud/api/syncDigest.js', () => ({
  readSyncDigest: (keys) => syncDigest.read(keys),
  isMissingSyncDigest: () => false,
}));
afterEach(() => syncDigest.reset());
