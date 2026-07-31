import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Nat-1/',
  plugins: [react()],
  // Two runners, split by extension so neither sees the other's files:
  //   *.test.js  -> `node --test`, for logic modules (fast, no DOM, no deps)
  //   *.test.jsx -> vitest + jsdom, for React components
  // Vitest is needed for components because they need a DOM, and it resolves
  // `import.meta.glob` — which plain node cannot, and which the adapter barrel
  // uses. `npm test` runs both.
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.jsx'],
    setupFiles: ['./vitest.setup.js'],
    restoreMocks: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
          if (id.includes('react')) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
