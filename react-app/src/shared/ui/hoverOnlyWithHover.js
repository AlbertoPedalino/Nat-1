import createCache from '@emotion/cache';
import { prefixer } from 'stylis';

// A finger cannot hover. A phone or a tablet still matches `:hover` on the
// last thing touched and keeps it until the next touch elsewhere, so a tap on
// a toast's X or on a menu item left the button underneath lit as if the
// cursor sat on it. Every hover style of the app — our own `'&:hover'` and
// MUI's — is therefore written under `@media (hover: hover)`: a mouse sees it,
// a finger never does. Focus and pressed looks are untouched.
//
// It is done once, where the styles become CSS (the Emotion cache main.jsx
// provides), so no component writes the media query by hand. A rule that is
// already inside a hover media query (`@media (hover: none)` …) is the
// author's own answer and is left alone. A selector list that mixes hover with
// something else (`&:hover, &:focus-visible`) is split: the focus half stays
// as it is, the hover half is gated.

const HOVER_MEDIA = '@media (hover: hover)';

function isHover(selector) {
  return selector.includes(':hover');
}

function insideHoverMedia(element) {
  for (let node = element.root; node; node = node.root) {
    if (node.type === '@media' && node.value.includes('hover')) return true;
  }
  return false;
}

// The rule again, as a child of `root`: the copy is not top level, so the
// cache inserts it only as part of its parent's text.
function copyRule(element, props, root) {
  return {
    ...element, props, value: props.join(','), root, parent: null, return: '', hoverGated: true,
  };
}

function atRule(element, value, children) {
  return {
    ...element, type: '@media', value, props: [value.slice('@media '.length)], children, return: '',
  };
}

// The stylis middleware: turns a hover rule, in place, into the same rule
// under `@media (hover: hover)`.
export function gateHover(element) {
  if (element.type !== 'rule' || element.hoverGated) return;
  const hover = element.props.filter(isHover);
  if (!hover.length || insideHoverMedia(element)) return;
  const rest = element.props.filter((selector) => !isHover(selector));
  const original = { ...element };
  // Mutated in place: the serializer is already holding this element.
  if (!rest.length) {
    const gate = atRule(original, HOVER_MEDIA, []);
    gate.children = [copyRule(original, hover, element)];
    Object.assign(element, gate);
    return;
  }
  // `@media all` only groups the two halves into the one rule the cache
  // expects back.
  const gate = atRule(original, HOVER_MEDIA, []);
  gate.root = element;
  gate.children = [copyRule(original, hover, gate)];
  Object.assign(element, atRule(original, '@media all', [copyRule(original, rest, element), gate]));
}

// The app's Emotion cache: Emotion's default (key `css`, vendor prefixes)
// plus the hover gate.
export function createAppStyleCache() {
  return createCache({ key: 'css', stylisPlugins: [prefixer, gateHover] });
}
