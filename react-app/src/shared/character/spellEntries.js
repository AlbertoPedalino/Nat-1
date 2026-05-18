function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function pickTagDisplay(tag, rawValue) {
  const parts = String(rawValue || '').split('|').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return '';
  if (tag === 'dc') return `DC ${parts[0]}`;
  if (tag === 'hit') return `+${parts[0].replace(/^\+/, '')}`;
  if (tag === 'scaledamage' || tag === 'scaledice') {
    return parts[2] ? `${parts[0]} (+${parts[2]}/level)` : parts[0];
  }
  if (parts.length >= 3) return parts[parts.length - 1];
  return parts[0];
}

export function strip5eMarkup(value) {
  return String(value ?? '')
    .replace(/\{@([a-z]+)\s+([^}]+)\}/gi, (_, tag, inner) => pickTagDisplay(tag.toLowerCase(), inner))
    .replace(/\{@([a-z]+)\s*\}/gi, '')
    .replace(/\{([^{}]+)\}/g, '$1')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function pushText(out, kind, text, depth = 0) {
  const cleaned = strip5eMarkup(text);
  if (!cleaned) return;
  cleaned.split(/\n+/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
    out.push({ kind, text: line, depth });
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
      const text = nodeToText(item);
      if (text) out.push({ kind: 'listItem', text, depth: listDepth });
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
    const text = nodeToText(node);
    if (text) out.push({ kind: 'listItem', text, depth: listDepth });
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
