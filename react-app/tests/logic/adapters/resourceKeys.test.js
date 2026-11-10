import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createAdapterRegistry, installAdapters } from '../../../src/adapters/registry.js';

// A feature's pieces are registered separately — its resource, its action
// cards, its rest side effects, effects that refill it — and linked only by
// the resource key written in each. A typo in one of those copies unlinks it
// without any error, so every reference must name a registered resource.

const ADAPTERS = fileURLToPath(new URL('../../../src/adapters/', import.meta.url));
const REFERENCE_FIELDS = /\b(?:resKey|resourceKey|targetResourceKey|targetKey)\s*:\s*['"]([A-Za-z0-9_]+)['"]/g;

async function adapterFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await adapterFiles(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

test('every resource key an adapter refers to is a registered resource', async () => {
  const registry = createAdapterRegistry();
  const declared = new Set();
  Object.keys(registry).filter((name) => /^register\w*SheetResources$/.test(name)).forEach((name) => {
    const original = registry[name].bind(registry);
    registry[name] = (...args) => {
      args.filter(Array.isArray).flat().forEach((def) => { if (def?.key) declared.add(def.key); });
      return original(...args);
    };
  });

  const sideEffects = [];
  const registerSideEffect = registry.registerResourceSideEffect.bind(registry);
  registry.registerResourceSideEffect = (key, fn) => { sideEffects.push(key); return registerSideEffect(key, fn); };

  const files = [];
  for (const folder of ['classes', 'feats', 'species', 'items']) {
    files.push(...await adapterFiles(path.join(ADAPTERS, folder)));
  }
  const modules = await Promise.all(files.map((file) => import(pathToFileURL(file).href)));
  installAdapters(modules.map((mod) => mod.default).filter(Boolean), registry);

  const unknown = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(REFERENCE_FIELDS)) {
      if (!declared.has(match[1])) unknown.push(`${path.relative(ADAPTERS, file)}: ${match[1]}`);
    }
  }
  sideEffects.filter((key) => !declared.has(key)).forEach((key) => unknown.push(`side effect: ${key}`));
  assert.ok(declared.size > 50 && sideEffects.length > 0, 'the adapters were installed');
  assert.deepEqual(unknown, []);
});
