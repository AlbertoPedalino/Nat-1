// The game-icons.net catalog (via react-icons) as one small file per drawing,
// so the battle map can offer all of them as map objects the way Lucide's
// dynamic catalog does: the panel loads the list of names, and each drawing is
// fetched only when it is shown. One module of all 4,000 drawings is ~2.7MB
// gzipped, too much for a phone that only needs the chest on the table.
//
// Writes public/game-icons/<name>.json ({ viewBox, paths }) and
// public/game-icons/index.json ({ version, names }). The folder is generated
// (gitignored); `npm run dev` and `npm run build` run this first, and it does
// nothing when the catalog is already written for this react-icons version.
//
// <name> is the drawing's react-icons name in kebab case without "Gi"
// (GiTreasureMap -> treasure-map): a map object stores `game:<name>`.
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules/react-icons/gi/index.mjs');
const { version } = JSON.parse(readFileSync(join(root, 'node_modules/react-icons/package.json'), 'utf8'));
const out = join(root, 'public/game-icons');
const indexFile = join(out, 'index.json');

if (existsSync(indexFile)) {
  try {
    if (JSON.parse(readFileSync(indexFile, 'utf8')).version === version) process.exit(0);
  } catch { /* rewritten below */ }
}

const kebab = (name) => name.slice(2)
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
  .toLowerCase();

const icons = new Map();
const pattern = /export function (Gi\w+) \(props\) \{\s*return GenIcon\((\{.*\})\)\(props\);/g;
for (const [, component, data] of readFileSync(source, 'utf8').matchAll(pattern)) {
  const tree = JSON.parse(data);
  const paths = tree.child.filter((node) => node.tag === 'path').map((node) => node.attr.d);
  const name = kebab(component);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || icons.has(name) || !paths.length) continue;
  icons.set(name, { viewBox: tree.attr.viewBox, paths });
}
if (icons.size < 1000) throw new Error(`Only ${icons.size} game icons read from ${source}: has its format changed?`);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const [name, drawing] of icons) writeFileSync(join(out, `${name}.json`), JSON.stringify(drawing));
const names = [...icons.keys()].sort();
writeFileSync(indexFile, JSON.stringify({ version, names }));
console.log(`game icons: ${names.length} drawings written to public/game-icons`);
