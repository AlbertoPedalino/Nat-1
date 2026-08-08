import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Only the React runtime itself belongs in the react chunk; packages that merely
// start with "react-" (react-markdown, react-window) are ordinary vendor code.
const REACT_PACKAGES = new Set([
  'react',
  'react-dom',
  'react-is',
  'scheduler',
  'react-router',
  'react-router-dom',
]);

// Markdown is used only by the lazily loaded DM Screen. Keep its unified/
// remark dependency graph out of the entry vendor chunk, otherwise Rollup's
// shared `vendor` bucket makes the browser preload it on every route.
const MARKDOWN_PACKAGES = new Set([
  'bail',
  'ccount',
  'character-entities',
  'comma-separated-tokens',
  'decode-named-character-reference',
  'devlop',
  'escape-string-regexp',
  'html-url-attributes',
  'longest-streak',
  'markdown-table',
  'property-information',
  'react-markdown',
  'space-separated-tokens',
  'stringify-entities',
  'trough',
  'unified',
  'zwitch',
]);

function isMarkdownPackage(pkg) {
  return MARKDOWN_PACKAGES.has(pkg)
    || /^(?:hast|mdast|micromark|rehype|remark|unist|vfile)(?:-|$)/.test(pkg);
}

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
    // The component suites drive real interactions through user-event, which
    // types a character at a time and waits for each render. NoteBoard alone
    // takes ~18s, so under a loaded parallel run the 5s default expires on
    // machine speed rather than on anything being wrong.
    testTimeout: 20000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const marker = id.lastIndexOf('node_modules/');
          if (marker < 0) return undefined;
          // Match the package name, not the whole path: the project lives in
          // `react-app/`, so a plain `id.includes('react')` swept every
          // dependency into the react chunk and `vendor` was never emitted.
          const [scope, scoped] = id.slice(marker + 'node_modules/'.length).split('/');
          const pkg = scope.startsWith('@') ? `${scope}/${scoped}` : scope;
          if (pkg.startsWith('@mui/') || pkg.startsWith('@emotion/')) return 'mui';
          if (REACT_PACKAGES.has(pkg)) return 'react';
          // Auth is part of the app shell, so Supabase is still fetched at
          // startup, but keeping it independent prevents unrelated lazy-only
          // packages from being pulled into the same oversized chunk.
          if (pkg.startsWith('@supabase/')) return 'supabase';
          if (isMarkdownPackage(pkg)) return 'markdown';
          // DynamicIcon exposes the complete Lucide catalog. Keeping every icon
          // in `vendor` defeats those dynamic imports and adds about a megabyte
          // to first load. Alphabet buckets keep the request count bounded
          // while loading only the part of the catalog a visible page uses.
          if (pkg === 'lucide-react') {
            const icon = id.replace(/\\/g, '/').match(/\/dist\/esm\/icons\/([^/]+)\.mjs$/)?.[1];
            if (icon) return `lucide-icons-${icon[0].toLowerCase()}`;
          }
          return 'vendor';
        },
      },
    },
  },
});
