import { capitalize } from '../../../shared/ui/textCase.js';

// 5etools `{=field}` placeholders in entries: magic variants fill them from the
// concrete item; any record shown without its template context drops them.

const TEMPLATE_PLACEHOLDER_RE = /\{=[^}]+\}/;

const DAMAGE_TYPE_LABELS = {
  A: 'Acid', B: 'Bludgeoning', C: 'Cold', F: 'Fire', O: 'Force', L: 'Lightning',
  N: 'Necrotic', P: 'Piercing', I: 'Poison', Y: 'Psychic', R: 'Radiant', S: 'Slashing', T: 'Thunder',
};

export function resolveVariantTemplate(node, fields, baseName) {
  if (node == null) return node;
  if (typeof node === 'string') {
    return node.replace(/\{=([^}/]+)(?:\/([^}]+))?\}/g, (match, field, modifier) => {
      if (field === 'baseName') {
        const name = String(baseName || 'item');
        if (modifier === 'l') return name.toLowerCase();
        if (modifier === 'a' || modifier === 'at') {
          const article = /^[aeiou]/i.test(name) ? 'an' : 'a';
          return modifier === 'at' ? capitalize(article) : article;
        }
        return name;
      }
      const value = fields?.[field];
      if (field === 'dmgType') return DAMAGE_TYPE_LABELS[value] || value || match;
      return value == null ? match : String(value);
    });
  }
  if (Array.isArray(node)) return node.map((entry) => resolveVariantTemplate(entry, fields, baseName));
  if (typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([key, value]) => (
      [key, resolveVariantTemplate(value, fields, baseName)]
    )));
  }
  return node;
}

export function stripTemplatedEntries(node) {
  if (node == null) return node;
  if (typeof node === 'string') {
    return TEMPLATE_PLACEHOLDER_RE.test(node) ? null : node;
  }
  if (Array.isArray(node)) {
    return node
      .map((child) => stripTemplatedEntries(child))
      .filter((child) => child != null && !(Array.isArray(child) && child.length === 0));
  }
  if (typeof node === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = stripTemplatedEntries(value);
    }
    return out;
  }
  return node;
}
