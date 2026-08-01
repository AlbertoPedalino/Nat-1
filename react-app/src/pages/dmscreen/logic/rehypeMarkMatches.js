import { splitHighlights } from './highlight.js';

// A rehype plugin that wraps search hits in <mark>. It runs on the tree
// react-markdown has already built, so matches are found in the *rendered*
// text: searching "strahd" marks the word inside a bold run or a table cell
// without the surrounding markup ever being touched.
//
// The <mark> elements are built here, never parsed from the note, so this adds
// no way for a note body to inject HTML.
export default function rehypeMarkMatches(options = {}) {
  const tokens = options.tokens || [];
  return (tree) => {
    if (tokens.length === 0) return;
    markChildren(tree, tokens);
  };
}

function markChildren(node, tokens) {
  if (!node || !Array.isArray(node.children)) return;
  node.children = node.children.flatMap((child) => {
    if (child.type === 'text') return textToNodes(child, tokens);
    markChildren(child, tokens);
    return child;
  });
}

function textToNodes(child, tokens) {
  const segments = splitHighlights(child.value, tokens);
  if (!segments.some((segment) => segment.match)) return child;
  return segments.map((segment) => (segment.match
    ? {
      type: 'element',
      tagName: 'mark',
      properties: {},
      children: [{ type: 'text', value: segment.text }],
    }
    : { type: 'text', value: segment.text }));
}
