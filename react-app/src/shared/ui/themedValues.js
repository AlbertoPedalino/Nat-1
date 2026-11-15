import { BASE_PALETTE_ID, resolveColors } from './colors.js';
import { BASE_STYLE_ID } from './shapes.js';

// Values the page's CSS cannot work out for itself from the theme's
// variables: a picture drawn as a data URL (it reads no CSS), the ink that
// reads on a fill (a contrast check), a picture cut in the style's shapes.
// Each is worked out once per palette and style and published as a CSS
// variable of its own on the page's root, so a recipe made once at import (a
// module's constant) still follows the viewer's choice: themedValue answers
// `var(--gb-t…)`.
//
// `key` names the value (the same key is the same variable); `compute` gets
// `resolve` (a text with every role in that palette's hexes, resolveColors)
// and `{ paletteId, styleId }`, and answers the CSS value.
const entries = new Map();
const computed = new Map();
const listeners = new Set();
let version = 0;
let notifying = false;

export function themedValue(key, compute) {
  let entry = entries.get(key);
  if (!entry) {
    entry = { name: `--gb-t${entries.size.toString(36)}`, compute };
    entries.set(key, entry);
    changed();
  }
  return `var(${entry.name})`;
}

// A value read while drawing is registered then: its listeners hear of it
// after the render, never during it.
function changed() {
  version += 1;
  if (notifying) return;
  notifying = true;
  queueMicrotask(() => {
    notifying = false;
    listeners.forEach((listener) => listener());
  });
}

export function subscribeThemedValues(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function themedValuesVersion() {
  return version;
}

// Every registered value in one palette and style, { '--gb-t0': 'url("data:…")', … }.
export function themedVariables(paletteId = BASE_PALETTE_ID, styleId = BASE_STYLE_ID) {
  const choice = { paletteId, styleId };
  const choiceKey = `${paletteId}|${styleId}`;
  let values = computed.get(choiceKey);
  if (!values) {
    values = new Map();
    computed.set(choiceKey, values);
  }
  const resolve = (text) => resolveColors(text, paletteId);
  const variables = {};
  entries.forEach((entry) => {
    if (!values.has(entry.name)) values.set(entry.name, computeValue(entry, resolve, choice));
    const value = values.get(entry.name);
    if (value) variables[entry.name] = value;
  });
  return variables;
}

// A value that cannot be worked out (a fill that is no colour) is left unset,
// as an unknown CSS value would be: it never takes the others with it.
function computeValue(entry, resolve, choice) {
  try {
    return entry.compute(resolve, choice) || null;
  } catch (_) {
    return null;
  }
}
