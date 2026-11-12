// Draws the app's sticker paper (src/shared/ui/stickerLayout.js) and has a
// local headless Chrome paint it into the WebP images the app ships, at 1x
// and 2x: public/paper/sticker-paper.webp and sticker-paper@2x.webp (WebP
// keeps the transparency at a fraction of a PNG's weight).
// Run after changing the paper's drawings or layout:
//   node scripts/build-sticker-paper.mjs [path to chrome]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TILE, paperSvg } from '../src/shared/ui/stickerLayout.js';

const CHROME_CANDIDATES = [
  process.argv[2],
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chrome = CHROME_CANDIDATES.find((path) => existsSync(path));
if (!chrome) throw new Error('No Chrome found: pass its path as the first argument.');

const QUALITY = 0.86;
const out = resolve('public/paper');
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'sticker-paper-'));
try {
  // The page paints the SVG into a canvas (from a blob, so the canvas stays
  // readable) and writes the WebP's data URL into itself, which Chrome prints.
  const page = (scale) => `<!doctype html><html><body><script>
    const svg = ${JSON.stringify(paperSvg())};
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = ${TILE * scale};
      canvas.height = canvas.width;
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      document.body.textContent = canvas.toDataURL('image/webp', ${QUALITY});
    };
    image.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  </script></body></html>`;
  [[1, 'sticker-paper.webp'], [2, 'sticker-paper@2x.webp']].forEach(([scale, name]) => {
    const file = join(work, `paper-${scale}.html`);
    writeFileSync(file, page(scale));
    const dom = execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--virtual-time-budget=10000',
      `--user-data-dir=${join(work, `profile-${scale}`)}`,
      '--dump-dom', pathToFileURL(file).href,
    ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const match = dom.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
    if (!match) throw new Error(`Chrome did not paint ${name}.`);
    writeFileSync(join(out, name), Buffer.from(match[1], 'base64'));
    console.log(`public/paper/${name}`);
  });
} finally {
  rmSync(work, { recursive: true, force: true });
}
