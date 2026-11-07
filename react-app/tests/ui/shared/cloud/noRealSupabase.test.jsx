import { isCloudConfigured, supabase } from '../../../../src/shared/cloud/supabaseClient.js';

// vite.config.js clears the Supabase env for tests: nothing may reach the real
// project listed in .env.
test('UI tests never get a real Supabase client', () => {
  expect(isCloudConfigured()).toBe(false);
  expect(supabase).toBe(null);
});
