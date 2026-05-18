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
 */
export function buildLineageOptions(versions, { parentName = '', suffixes = [] } = {}) {
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
    const token = label.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!label || !token || seen.has(token)) return;

    seen.add(token);
    options.push({ key: label, label });
  });

  return options;
}
