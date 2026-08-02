// Hit points for campaign characters.
//
// Max HP is NOT stored on a sheet: it is derived from hit dice, Constitution,
// level and class features, so reading `data.maxHP` gets undefined for almost
// every character. The derivation lives behind the class adapters, which is why
// the encounter builder loads them before summarising — and why this module
// does the same rather than guessing.
//
// The heavy imports are dynamic on purpose: `shared/` is imported by node tests
// and by pages that must not pull the adapter barrel into their bundle. Nothing
// is loaded until a scene actually asks for vitals.

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export async function readCampaignVitals(rows) {
  const vitals = new Map();
  const list = (rows || []).filter((row) => row?.id && row.data);
  if (!list.length) return vitals;

  const [adapters, summary, players] = await Promise.all([
    import('../../adapters/index.js'),
    import('../../pages/campaigns/sheetSummary.js'),
    import('../../pages/encounterbuilder/logic/campaignPlayer.js'),
  ]);

  // Class effects feed the max-HP calculation, so the adapters have to be
  // registered before summarising or a barbarian reads short.
  const classNames = [...new Set(list.flatMap((row) => players.characterClassNames(row.data)))];
  await Promise.all([
    adapters.loadCoreAdapters().catch(() => {}),
    adapters.loadClassAdapters(classNames).catch(() => {}),
  ]);

  for (const row of list) {
    const sheet = summary.summarizeCharacter(row.data);
    if (!sheet) continue;
    const hpMax = numberOrNull(sheet.maxHP);
    if (hpMax == null) continue;
    vitals.set(row.id, {
      // An absent current HP means undamaged, not zero.
      hpCurrent: numberOrNull(sheet.currentHP) ?? hpMax,
      hpMax,
      // Temporary hit points are not part of the maximum and are shown apart:
      // adding them into the bar would make a character look over-healed.
      tempHp: Math.max(0, numberOrNull(sheet.tempHP) ?? 0),
    });
  }

  return vitals;
}

// Fold freshly derived vitals into roster entries, leaving the rest untouched.
export function mergeVitals(roster, vitals) {
  if (!vitals?.size) return roster || [];
  return (roster || []).map((entry) => {
    const found = vitals.get(entry.characterId);
    return found ? { ...entry, ...found } : entry;
  });
}
