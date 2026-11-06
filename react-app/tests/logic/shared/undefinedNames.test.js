import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const SRC = new URL('../../../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// Names the browser and the build provide.
const GLOBALS = new Set([
  'window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'console', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'fetch', 'URL', 'URLSearchParams',
  'Blob', 'File', 'FileReader', 'Image', 'HTMLElement', 'HTMLCanvasElement', 'Event', 'CustomEvent', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'AbortController',
  'structuredClone', 'performance', 'crypto', 'atob', 'btoa', 'queueMicrotask', 'getComputedStyle', 'matchMedia',
  'alert', 'confirm', 'prompt', 'location', 'history', 'screen', 'devicePixelRatio', 'globalThis', 'TextEncoder',
  'TextDecoder', 'WebGLRenderingContext', 'WebGL2RenderingContext', 'OffscreenCanvas', 'createImageBitmap', 'ImageData',
  'DOMRect', 'DOMParser', 'Node', 'Element', 'FormData', 'Headers', 'Request', 'Response', 'WebSocket', 'indexedDB',
  'visualViewport', 'innerWidth', 'innerHeight', 'Path2D', 'DOMMatrix', 'CSS', 'self', 'Intl', 'undefined', 'NaN',
  'Infinity', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Math', 'Date', 'JSON', 'Promise', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'Symbol', 'Error', 'TypeError', 'RangeError', 'RegExp', 'Reflect', 'Proxy', 'parseInt',
  'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'Uint8Array', 'Uint16Array', 'Uint32Array', 'Int32Array', 'Float32Array', 'Float64Array', 'ArrayBuffer', 'DataView',
  'BigInt', 'arguments', 'process', 'BroadcastChannel',
]);

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(js|jsx)$/.test(name)) out.push(path);
  }
  return out;
}

// A name used but never declared or imported throws only when that line runs
// (a read-only sheet's badge did, on the icon it never imported).
test('every name the source uses is declared, imported or a browser global', () => {
  const offenders = [];
  for (const path of sourceFiles(SRC)) {
    const ast = parse(readFileSync(path, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
    traverse(ast, {
      Program(p) {
        for (const name of Object.keys(p.scope.globals)) {
          if (!GLOBALS.has(name)) offenders.push(`${relative(SRC, path).replace(/\\/g, '/')}: ${name}`);
        }
        p.stop();
      },
    });
  }
  assert.deepEqual(offenders, []);
});
