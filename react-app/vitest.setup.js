import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom keeps mounted trees between tests otherwise, so a query would match a
// component left over from an earlier case.
afterEach(cleanup);
