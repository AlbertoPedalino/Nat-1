import { asArray } from '../lists.js';
import { REF_TAGS, scanMarkup, tagDisplayText, tagParts } from './inlineMarkup.js';

// Entry prose as tokens: text, em/strong runs and record references; every
// other tag shows its display text (inlineMarkup.js), plain {braces} their
// content.
function tokenizeInlineMarkup(raw) {
  const out = [];
  scanMarkup(raw).segments.forEach((segment) => {
    if (segment.type === 'text') {
      out.push({ type: 'text', text: segment.text.replace(/\{([^{}]+)\}/g, '$1') });
      return;
    }
    const { tag, arg } = segment;
    if (tag === 'i' || tag === 'italic') {
      out.push({ type: 'em', text: tagParts(arg)[0] });
    } else if (tag === 'b' || tag === 'bold') {
      out.push({ type: 'strong', text: tagParts(arg)[0] });
    } else if (REF_TAGS.has(tag)) {
      const parts = tagParts(arg);
      out.push({ type: 'ref', refType: tag, text: tagDisplayText(tag, arg), target: parts[0], source: parts[1] || '' });
    } else {
      out.push({ type: 'text', text: tagDisplayText(tag, arg) });
    }
  });
  return out
    .filter((token) => token.text != null && String(token.text).length > 0)
    .map((token) => ({
      ...token,
      text: String(token.text)
        .replace(/\s+\n/g, '\n')
        .replace(/[ \t]{2,}/g, ' '),
    }));
}

function tokensToPlainText(tokens) {
  return tokens.map((token) => token.text).join('').trim();
}

export function strip5eMarkup(value) {
  return tokensToPlainText(tokenizeInlineMarkup(value));
}

export { tokenizeInlineMarkup };

function pushText(out, kind, raw, depth = 0) {
  if (raw == null) return;
  String(raw)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const tokens = tokenizeInlineMarkup(line);
      const text = tokensToPlainText(tokens);
      if (!text) return;
      out.push({ kind, text, tokens, depth });
    });
}

function nodeToText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return strip5eMarkup(node);
  if (Array.isArray(node)) return node.map(nodeToText).filter(Boolean).join(' ');
  if (typeof node !== 'object') return '';

  if (node.type === 'item') {
    const body = nodeToText(node.entries ?? node.entry ?? node.items);
    const name = strip5eMarkup(node.name || '');
    return [name ? `${name}.` : '', body].filter(Boolean).join(' ').trim();
  }

  if (node.type === 'list') {
    return asArray(node.items).map(nodeToText).filter(Boolean).join('; ');
  }

  if (node.type === 'table') {
    const headers = asArray(node.colLabels).map(nodeToText).filter(Boolean).join(' | ');
    const rows = asArray(node.rows).map((row) => asArray(row?.row || row).map(nodeToText).filter(Boolean).join(' | '));
    return [headers, ...rows].filter(Boolean).join('; ');
  }

  const body = nodeToText(node.entries ?? node.entry ?? node.items ?? node.rows);
  const name = strip5eMarkup(node.name || '');
  return [name ? `${name}.` : '', body].filter(Boolean).join(' ').trim();
}

function nodeToTokens(node) {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return tokenizeInlineMarkup(node);
  if (Array.isArray(node)) {
    return node.flatMap((part, idx) => {
      const tokens = nodeToTokens(part);
      if (!tokens.length) return tokens;
      if (idx > 0) return [{ type: 'text', text: ' ' }, ...tokens];
      return tokens;
    });
  }
  if (typeof node !== 'object') return [];

  if (node.type === 'item') {
    const name = node.name ? tokenizeInlineMarkup(`${strip5eMarkup(node.name)}.`) : [];
    const body = nodeToTokens(node.entries ?? node.entry ?? node.items);
    const sep = name.length && body.length ? [{ type: 'text', text: ' ' }] : [];
    return [...name, ...sep, ...body];
  }

  if (node.type === 'list') {
    const items = asArray(node.items)
      .map(nodeToTokens)
      .filter((arr) => arr.length);
    return items.flatMap((tokens, idx) => idx > 0 ? [{ type: 'text', text: '; ' }, ...tokens] : tokens);
  }

  if (node.type === 'table') {
    return tokenizeInlineMarkup(nodeToText(node));
  }

  const body = nodeToTokens(node.entries ?? node.entry ?? node.items ?? node.rows);
  if (node.name) {
    const name = tokenizeInlineMarkup(`${strip5eMarkup(node.name)}.`);
    if (!body.length) return name;
    return [...name, { type: 'text', text: ' ' }, ...body];
  }
  return body;
}

function walkEntries(node, out, depth = 0, listDepth = 0) {
  if (node == null) return;
  if (typeof node === 'string' || typeof node === 'number') {
    pushText(out, 'paragraph', node, depth);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((entry) => walkEntries(entry, out, depth, listDepth));
    return;
  }
  if (typeof node !== 'object') return;

  if (node.type === 'list') {
    asArray(node.items).forEach((item) => {
      const tokens = nodeToTokens(item);
      const text = tokensToPlainText(tokens);
      if (text) out.push({ kind: 'listItem', text, tokens, depth: listDepth });
    });
    return;
  }

  if (node.type === 'table') {
    out.push({
      kind: 'table',
      caption: strip5eMarkup(node.caption || node.name || ''),
      headers: asArray(node.colLabels).map(nodeToText),
      rows: asArray(node.rows).map((row) => asArray(row?.row || row).map(nodeToText)),
    });
    return;
  }

  if (node.type === 'item') {
    const tokens = nodeToTokens(node);
    const text = tokensToPlainText(tokens);
    if (text) out.push({ kind: 'listItem', text, tokens, depth: listDepth });
    return;
  }

  if (node.name) pushText(out, 'heading', node.name, depth);
  if (node.entries != null) walkEntries(node.entries, out, depth + (node.name ? 1 : 0), listDepth);
  else if (node.entry != null) walkEntries(node.entry, out, depth, listDepth);
  else if (node.items != null) walkEntries(node.items, out, depth, listDepth);
}

export function entriesToTextBlocks(entries) {
  const out = [];
  walkEntries(entries, out);
  return out;
}

// Swap {@scaledamage ...} → {@scaledice ...} recursively so higher-level slot
// scaling text shows only the per-level step die instead of "base (+step/level)".
function rewriteHigherLevelMarkup(node) {
  if (node == null) return node;
  if (Array.isArray(node)) return node.map(rewriteHigherLevelMarkup);
  if (typeof node === 'string') return node.replace(/\{@scaledamage(\s)/g, '{@scaledice$1');
  if (typeof node === 'object') {
    const out = Array.isArray(node) ? [] : {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = rewriteHigherLevelMarkup(value);
    }
    return out;
  }
  return node;
}

export function entriesToHigherLevelBlocks(entries) {
  return entriesToTextBlocks(rewriteHigherLevelMarkup(entries));
}

export function entriesToPlainText(entries, options = {}) {
  const text = entriesToTextBlocks(entries).map((block) => {
    if (block.kind === 'table') {
      const header = block.headers?.length ? block.headers.join(' | ') : '';
      const rows = (block.rows || []).map((row) => row.join(' | ')).join('; ');
      return [block.caption, header, rows].filter(Boolean).join(': ');
    }
    if (block.kind === 'listItem') return `- ${block.text}`;
    return block.text;
  }).filter(Boolean).join('\n');

  const maxLength = Number(options.maxLength || 0);
  if (!maxLength || text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}
