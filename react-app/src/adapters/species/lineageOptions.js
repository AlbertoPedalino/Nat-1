/**
 * Build canonical lineage option list from a 5etools species `_versions` array.
 *
 * The 5etools version name is typically `"<Parent>; <Lineage> <Suffix>"`
 * (e.g. `"Elf; Drow Lineage"`, `"Tiefling; Abyssal Legacy"`, `"Shifter; Beasthide"`).
 * This helper extracts the lineage segment, strips known taxonomy suffixes,
 * and emits an option whose `key` and `label` are the canonical short name.
 *
 * Returning a canonical key (`'Drow'`, `'High Elf'`, ...) lets adapters reuse
 * the same identifier in `requiredChoice.value` predicates and keeps stored
 * choices stable across rulebook reprints.
 *
 * Pass `expect` (the canonical tokens the adapter hardcodes in its
 * `requiredChoice.value` predicates) to guard against source-data drift: if
 * the upstream `_versions` naming changes and a token no longer parses out,
 * the predicates would silently stop matching. With `expect` set, that drift
 * fails loud at install time (throw in dev, console.error otherwise) instead.
 */
const canonToken = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function buildLineageOptions(versions, { parentName = '', suffixes = [], expect = [] } = {}) {
  if (!Array.isArray(versions)) return [];
  const parentLower = String(parentName).toLowerCase();
  const suffixPatterns = suffixes.map((suffix) => new RegExp(`\\s+${suffix}\\s*$`, 'i'));

  const stripSuffix = (value) => suffixPatterns.reduce(
    (acc, pattern) => acc.replace(pattern, ''),
    String(value || ''),
  ).trim();

  const seen = new Set();
  const options = [];

  versions.forEach((version) => {
    const raw = String(version?.name || '').trim();
    if (!raw) return;

    const tail = raw.includes(';') ? raw.split(';').slice(1).join(';').trim() : raw;
    if (!tail || tail.toLowerCase() === parentLower) return;

    const label = stripSuffix(tail);
    const token = canonToken(label);
    if (!label || !token || seen.has(token)) return;

    seen.add(token);
    options.push({ key: label, label });
  });

  if (expect && expect.length) {
    const produced = new Set(options.map((o) => canonToken(o.key)));
    const missing = expect.filter((t) => !produced.has(canonToken(t)));
    if (missing.length) {
      const msg = `[buildLineageOptions] ${parentName || 'species'}: expected lineage token(s) `
        + `${missing.map((m) => `'${m}'`).join(', ')} did not parse out of _versions `
        + `(parsed: ${options.map((o) => `'${o.key}'`).join(', ') || 'none'}). `
        + `requiredChoice predicates using these values would silently fail — `
        + `source-data naming likely drifted.`;
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) throw new Error(msg);
      else console.error(msg);
    }
  }

  return options;
}
