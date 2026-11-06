import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// Every .js/.jsx file under src/ (5etools data left out) whose text matches
// `pattern`, as paths relative to src/ with forward slashes. `allow` lists the
// files where the match is the one definition.
export function sourceFilesMatching(pattern, { allow = [] } = {}) {
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { if (name !== 'data') walk(path); continue; }
      if (!/\.(js|jsx)$/.test(name)) continue;
      const file = relative(SRC, path).replace(/\\/g, '/');
      if (allow.includes(file)) continue;
      if (pattern.test(readFileSync(path, 'utf8'))) offenders.push(file);
    }
  };
  walk(SRC);
  return offenders;
}
