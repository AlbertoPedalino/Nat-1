import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// A source file's text with its line ends as \n, whatever the checkout wrote:
// with core.autocrlf on Windows the files carry \r\n, and a guard that spans
// lines (`...\n\s*</TipIconButton>`) would then never match and pass in
// silence. Every scan reads through here.
function readText(path) {
  return readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
}

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
      if (pattern.test(readText(path))) offenders.push(file);
    }
  };
  walk(SRC);
  return offenders;
}

// The same scan line by line, comment lines left out: `file:line` for every
// code line that matches.
export function sourceLinesMatching(pattern, { allow = [] } = {}) {
  const hits = [];
  for (const file of sourceFilesMatching(pattern, { allow })) {
    readText(join(SRC, file)).split('\n').forEach((line, index) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      if (pattern.test(line)) hits.push(`${file}:${index + 1}`);
    });
  }
  return hits;
}

// The text of a file under src/ (a path as sourceFilesMatching gives it).
export function readSource(file) {
  return readText(join(SRC, file));
}
