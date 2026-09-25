import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every postgres_changes subscription in the app names its table literally, and
// that table is published by a numbered Supabase script. `characters` is
// REST/RPC only (04_characters_realtime.sql): following it would push the whole
// sheet blob on every autosave. Reads and writes of `characters` over REST are
// not subscriptions and are not checked here.

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const SRC = join(ROOT, 'src');
const SUPABASE = join(ROOT, 'supabase');
const FORBIDDEN = new Set(['characters']);

async function walk(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}

async function subscriptions() {
  const files = (await walk(SRC)).filter((path) => ['.js', '.jsx'].includes(extname(path)));
  const found = [];
  for (const path of files) {
    const source = await readFile(path, 'utf8');
    for (const match of source.matchAll(/['"]postgres_changes['"]\s*,\s*\{/g)) {
      const options = source.slice(match.index + match[0].length, match.index + match[0].length + 300);
      const table = options.match(/\btable\s*:\s*(['"])([a-z0-9_]+)\1/);
      found.push({ file: relative(ROOT, path), table: table ? table[2] : null });
    }
  }
  return found;
}

async function publishedTables() {
  const scripts = (await readdir(SUPABASE)).filter((name) => /^\d{2}_.*\.sql$/.test(name));
  const tables = new Set();
  for (const name of scripts) {
    const sql = await readFile(join(SUPABASE, name), 'utf8');
    for (const match of sql.matchAll(/alter publication supabase_realtime add table public\.([a-z0-9_]+)/g)) {
      tables.add(match[1]);
    }
  }
  return tables;
}

test('postgres_changes subscriptions name a published table literally, never characters', async () => {
  const found = await subscriptions();
  assert.ok(found.length >= 10, `expected the app's subscriptions, found ${found.length}`);

  const dynamic = found.filter((entry) => !entry.table).map((entry) => entry.file);
  assert.deepEqual(dynamic, [], 'a postgres_changes table must be a string literal');

  const forbidden = found.filter((entry) => FORBIDDEN.has(entry.table));
  assert.deepEqual(forbidden, [], 'follow character_digests / character_sheet_revisions, not characters');

  const published = await publishedTables();
  const unpublished = found.filter((entry) => !published.has(entry.table));
  assert.deepEqual(unpublished, [], 'every subscribed table must be added to supabase_realtime by a script');
});

test('no Supabase script adds characters to the Realtime publication', async () => {
  assert.equal((await publishedTables()).has('characters'), false);
});
