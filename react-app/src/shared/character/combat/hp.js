import { ownedFeatNames } from '../progression/selectedFeats.js';
import { collectSheetEffects } from '../sheet/sheetEffects.js';
import { finalAbilityModifier } from '../progression/abilityScores.js';
import { primaryClassLevel, totalLevel } from '../progression/classLevel.js';

// The faces of a class's Hit Die, from its 5etools record or saved snapshot
// (`hd: { faces }`, a list of those, or text like 'd10'); d8 when unknown.
export function hitDieFaces(classRecord) {
  const hd = classRecord?.hd ?? classRecord?.hitDie;
  if (hd?.faces) return Number(hd.faces) || 8;
  if (Array.isArray(hd) && hd[0]?.faces) return Number(hd[0].faces) || 8;
  const parsed = String(hd || '').match(/d(\d+)/i);
  return parsed ? Number(parsed[1]) || 8 : 8;
}

function levelEntry(character, key, faces) {
  const rolled = Number(character?.hpManualRolls?.[key]);
  if (character?.hpMode === 'rolled' && Number.isFinite(rolled) && rolled > 0) {
    return Math.min(faces, rolled);
  }
  return Math.floor(faces / 2) + 1;
}

// The one hit point bonus rule, `hpBonus` sheet effects of any owner:
// `amount` once its owner reaches `minLevel`, `perLevelAfter` for each owner
// level beyond it (Draconic Resilience), `perLevel` for each character level
// (Dwarven Toughness, Tough).
export function hpBonusFromEffect(effect, ownerLevel, characterLevel) {
  if (!effect || effect.type !== 'hpBonus') return 0;
  const min = Number(effect.minLevel || 1);
  const level = Number(ownerLevel || 1);
  if (level < min) return 0;
  return Number(effect.amount || 0)
    + Number(effect.perLevelAfter || 0) * Math.max(0, level - min)
    + Number(effect.perLevel || 0) * Number(characterLevel || 1);
}

// What a species' or feat's effects add per character level, for snapshots.
export function hpBonusPerLevelOf(effects) {
  return (effects || []).reduce((sum, effect) => (
    effect?.type === 'hpBonus' ? sum + Number(effect.perLevel || 0) : sum
  ), 0);
}

// A sheet whose adapters could not load (a stale-deploy chunk) still gets the
// bonuses its saved snapshots carry.
function snapshotHpBonus(character, primaryLevel, characterLevel) {
  const classBonus = (effects, level) => (effects || [])
    .reduce((sum, effect) => sum + hpBonusFromEffect(effect, level, characterLevel), 0);
  let total = classBonus(character.adapterRuntime?.classEffects, primaryLevel);
  (character.extraClasses || []).forEach((ec) => {
    total += classBonus(ec.adapterRuntime?.classEffects, Math.max(1, Number(ec.level || 1)));
  });
  const owned = new Set(ownedFeatNames(character));
  const featPerLevel = (character.allFeatSnapshots || [])
    .filter((feat) => owned.has(feat?.name))
    .reduce((sum, feat) => sum + (Number(feat.hpBonusPerLevel) || 0), 0);
  const speciesPerLevel = Number(character.speciesSnapshot?.hpBonusPerLevel || 0);
  return total + (featPerLevel + speciesPerLevel) * characterLevel;
}

export function computeMaxHp(character, conMod) {
  if (!character?.className) return 0;
  const conModNum = Number.isFinite(Number(conMod))
    ? Number(conMod)
    : finalAbilityModifier(character, 'con', { ignoreWildShape: true });
  const extras = character.extraClasses || [];
  const primaryLevel = primaryClassLevel(character);
  const characterLevel = totalLevel(character);

  const primaryFaces = hitDieFaces(character.cls || character.clsSnapshot);
  let total = primaryFaces + conModNum;
  for (let lv = 2; lv <= primaryLevel; lv += 1) {
    total += levelEntry(character, lv, primaryFaces) + conModNum;
  }
  extras.forEach((ec, index) => {
    const faces = hitDieFaces(ec.cls || ec.clsSnapshot);
    const ecLevel = Math.max(1, Number(ec.level || 1));
    for (let lv = 1; lv <= ecLevel; lv += 1) {
      total += levelEntry(character, `extra_${index}_${lv}`, faces) + conModNum;
    }
  });

  // Every owner's `hpBonus` effects, gated like any effect (collectSheetEffects).
  const bonuses = collectSheetEffects(character).filter((effect) => effect.type === 'hpBonus');
  total += bonuses.length
    ? bonuses.reduce((sum, effect) => sum + hpBonusFromEffect(effect, effect.ownerLevel, characterLevel), 0)
    : snapshotHpBonus(character, primaryLevel, characterLevel);

  return Math.max(1, total);
}
