// New ids, made the same way everywhere: `<prefix>_<time>_<random>`, letters,
// digits and underscores only, so an id is valid wherever ids are checked
// (link groups, camera sources, storage keys, URLs). Ids already stored keep
// whatever shape they were made with.
export function makeId(prefix = '', { now = Date.now(), random = Math.random } = {}) {
  const time = Number(now).toString(36);
  const tail = random().toString(36).slice(2, 10).padEnd(8, '0');
  return prefix ? `${prefix}_${time}_${tail}` : `${time}_${tail}`;
}
