// The base maximum hit points of campaign characters.
//
// Max HP is NOT stored on a sheet: it is derived from hit dice, Constitution,
// level, class and species features, feats and items. Character digests carry
// everything else a table needs and a hash of these inputs; this derives the
// base maximum (before `maxHPBonus`) from the full sheet: runtime adapters
// first, then `calcMaxHP`. Its result, per `hpBasis`, is also what a health
// command starts from (`commandCharacterVitals`), which reads a sheet only when
// its caller does not have one.
//
// The heavy imports are dynamic on purpose: `shared/` is imported by node tests
// and by pages that must not pull the adapter barrel into their bundle. Nothing
// is loaded until a consumer actually needs a maximum.

export async function readBaseMaxHp(rows) {
  const out = new Map();
  const list = (rows || []).filter((row) => row?.id && row.data && typeof row.data === 'object');
  if (!list.length) return out;
  const [{ ensureSheetRuntimeAdapters }, { calcMaxHP }] = await Promise.all([
    import('../../pages/charsheet/state/sheetRuntimeAdapters.js'),
    import('../../pages/charsheet/state/calculations.js'),
  ]);
  await ensureSheetRuntimeAdapters(list.map((row) => row.data));
  for (const row of list) {
    try {
      const base = Number(calcMaxHP(row.data));
      if (Number.isFinite(base)) out.set(String(row.id), Math.max(1, Math.round(base)));
    } catch (_) {
      // A sheet the rules cannot read keeps its bar hidden rather than wrong.
    }
  }
  return out;
}
