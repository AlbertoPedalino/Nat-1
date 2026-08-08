import {
  existsSync, readdirSync, readFileSync, statSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = join(projectRoot, 'src');
const sourceExtensions = new Set(['.js', '.jsx']);

function walk(folder) {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const sourceFiles = walk(sourceRoot)
  .filter((path) => sourceExtensions.has(extname(path)))
  .filter((path) => !/\.test\.jsx?$/.test(path));
const sourceSet = new Set(sourceFiles.map((path) => resolve(path)));
const contents = new Map(sourceFiles.map((path) => [path, readFileSync(path, 'utf8')]));
const isVttFile = (path) => /[\\/]pages[\\/]vtt[\\/]|[\\/]shared[\\/]vtt[\\/]/.test(path);

function resolveModule(importer, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(importer), specifier);
  const candidates = [base, `${base}.js`, `${base}.jsx`, join(base, 'index.js'), join(base, 'index.jsx')];
  return candidates.find((path) => existsSync(path) && sourceSet.has(resolve(path))) || null;
}

function importedModules(path, source) {
  const specifiers = new Set();
  for (const expression of [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]) {
    for (const match of source.matchAll(expression)) specifiers.add(match[1]);
  }
  return [...specifiers].map((specifier) => resolveModule(path, specifier)).filter(Boolean);
}

// Every production VTT module must be reachable from the application entry.
// Tests do not count: a module used only by its test is dead application code.
const entry = join(sourceRoot, 'main.jsx');
const reachable = new Set();
const queue = [entry];
while (queue.length) {
  const path = queue.pop();
  if (!path || reachable.has(path)) continue;
  reachable.add(path);
  for (const dependency of importedModules(path, contents.get(path) || '')) queue.push(dependency);
}

const problems = sourceFiles
  .filter(isVttFile)
  .filter((path) => !reachable.has(path))
  .map((path) => `unreachable module: ${relative(projectRoot, path)}`);

function namedImports(path, source) {
  const imports = [];
  const expression = /\b(?:import|export)\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gs;
  for (const match of source.matchAll(expression)) {
    const target = resolveModule(path, match[2]);
    if (!target) continue;
    const names = match[1].split(',').map((entry) => entry.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]);
    imports.push({ target, names: new Set(names) });
  }
  return imports;
}

const importsByFile = new Map(sourceFiles.map((path) => [path, namedImports(path, contents.get(path))]));
function usedThroughNamespace(target, name) {
  return sourceFiles.some((consumer) => {
    const source = contents.get(consumer);
    const expression = /\bimport\s*\*\s*as\s*([A-Za-z_$][\w$]*)\s*from\s*['"]([^'"]+)['"]/g;
    for (const match of source.matchAll(expression)) {
      if (resolveModule(consumer, match[2]) !== target) continue;
      if (new RegExp(`\\b${match[1]}\\.${name}\\b`).test(source)) return true;
    }
    return false;
  });
}

// Feature-level exports should have a consumer. Shared geometry modules also
// expose small, independently tested primitives as their deliberate API, so
// module reachability is the useful signal for those rather than app imports.
for (const path of sourceFiles.filter((entry) => /[\\/]pages[\\/]vtt[\\/]/.test(entry))) {
  const source = contents.get(path);
  const declarations = source.matchAll(/\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g);
  for (const declaration of declarations) {
    const name = declaration[1];
    const localUses = source.match(new RegExp(`\\b${name}\\b`, 'g'))?.length || 0;
    const imported = sourceFiles.some((consumer) => (
      importsByFile.get(consumer).some((entry) => entry.target === path && entry.names.has(name))
    ));
    if (localUses <= 1 && !imported && !usedThroughNamespace(path, name)) {
      problems.push(`unused export: ${relative(projectRoot, path)} -> ${name}`);
    }
  }
}

// Raw colours in feature code are almost always a missed theme/palette token.
// Dynamic user colours remain valid because this only catches source literals.
for (const path of sourceFiles.filter((entry) => /[\\/]pages[\\/]vtt[\\/]/.test(entry))) {
  const source = contents.get(path);
  const literals = source.match(/#[0-9a-f]{3,8}\b|rgba?\s*\(/gi) || [];
  if (literals.length) {
    problems.push(`raw colour literal: ${relative(projectRoot, path)} (${literals.length})`);
  }
}

if (problems.length) {
  console.error(`VTT hygiene check failed:\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('VTT hygiene check passed.');
}
