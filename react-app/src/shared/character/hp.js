import { installedRegistry } from '../../adapters/index.js';

function statModFromScore(score) {
  return Math.floor((Number(score || 0) - 10) / 2);
}

function getHitDieFaces(source) {
  const hd = source?.hd;
  if (!hd) return 8;
  if (hd.faces) return Number(hd.faces) || 8;
  if (Array.isArray(hd) && hd[0]?.faces) return Number(hd[0].faces) || 8;
  return 8;
}

function levelEntry(character, key, faces) {
  const rolled = Number(character?.hpManualRolls?.[key]);
  if (character?.hpMode === 'rolled' && Number.isFinite(rolled) && rolled > 0) {
    return Math.min(faces, rolled);
  }
  return Math.floor(faces / 2) + 1;
}

function safeArray(getter, ...args) {
  if (typeof getter !== 'function') return [];
  try { return getter(...args) || []; } catch { return []; }
}

function classHpBonusFor(className, subclassShortName, classLevel, snapshotEffects) {
  const live = [
    ...safeArray(installedRegistry.getClassSheetEffects, className),
    ...safeArray(installedRegistry.getSubclassSheetEffects, className, subclassShortName),
  ];
  const effects = live.length ? live : (snapshotEffects || []);
  return effects.reduce((sum, eff) => {
    if (!eff || eff.type !== 'hpBonus') return sum;
    const min = Number(eff.minLevel || 1);
    if (Number(classLevel || 1) < min) return sum;
    const base = Number(eff.amount || 0);
    const per = Number(eff.perLevelAfter || 0);
    return sum + base + per * Math.max(0, Number(classLevel || 1) - min);
  }, 0);
}

function speciesHpBonus(character) {
  const live = installedRegistry.getSpeciesSheetHpBonus
    ? Number(installedRegistry.getSpeciesSheetHpBonus(character?.speciesName, character?.speciesSource) || 0)
    : 0;
  if (live) return live;
  return Number(character?.speciesSnapshot?.hpBonusPerLevel || 0);
}

function collectFeatNames(character) {
  const out = new Set();
  (character?.allFeatSnapshots || []).forEach((feat) => { if (feat?.name) out.add(feat.name); });
  Object.entries(character?.choices || {}).forEach(([key, value]) => {
    const lk = String(key || '').toLowerCase();
    const isFeatKey =
      lk === 'feat_origin' ||
      lk === 'species_origin_feat' ||
      lk.startsWith('feat_') ||
      /^mc\d+_feat_/.test(lk) ||
      lk.includes('fighting_style') ||
      lk.includes('epic_boon') ||
      /^feat_asi_lv\d+$/.test(lk);
    if (!isFeatKey) return;
    const arr = Array.isArray(value) ? value : [value];
    arr.forEach((entry) => {
      if (typeof entry !== 'string' || !entry) return;
      out.add(entry.split('|')[0].trim());
    });
  });
  return [...out].filter(Boolean);
}

function featHpBonusPerLevel(featName, featSnapshot) {
  if (featSnapshot?.hpBonusPerLevel != null) return Number(featSnapshot.hpBonusPerLevel) || 0;
  const adapter = typeof installedRegistry.getFeatAdapter === 'function'
    ? installedRegistry.getFeatAdapter(featName)
    : null;
  if (typeof adapter !== 'function') return 0;
  try {
    const out = adapter({ name: featName }) || {};
    return Number(out.hpBonusPerLevel || 0);
  } catch {
    return 0;
  }
}

export function computeMaxHp(character, conMod) {
  if (!character?.className) return 0;
  const conModNum = Number.isFinite(Number(conMod))
    ? Number(conMod)
    : statModFromScore(character?.finalScores?.con);
  const extras = character.extraClasses || [];
  const totalLevel = Math.max(1, Number(character.level || 1));
  const extrasTotal = extras.reduce((sum, ec) => sum + Number(ec.level || 0), 0);
  const primaryLevel = Math.max(1, Number(character.classLevel || (totalLevel - extrasTotal) || 1));

  const primaryFaces = getHitDieFaces(character.cls || character.clsSnapshot);
  let total = primaryFaces + conModNum;
  for (let lv = 2; lv <= primaryLevel; lv += 1) {
    total += levelEntry(character, lv, primaryFaces) + conModNum;
  }
  total += classHpBonusFor(
    character.className,
    character.subclassShortName,
    primaryLevel,
    character.adapterRuntime?.classEffects,
  );

  extras.forEach((ec, index) => {
    const faces = getHitDieFaces(ec.cls || ec.clsSnapshot);
    const ecLevel = Math.max(1, Number(ec.level || 1));
    for (let lv = 1; lv <= ecLevel; lv += 1) {
      total += levelEntry(character, `extra_${index}_${lv}`, faces) + conModNum;
    }
    total += classHpBonusFor(ec.name, ec.subclassShortName, ecLevel, ec.adapterRuntime?.classEffects);
  });

  total += speciesHpBonus(character) * totalLevel;

  const featNames = collectFeatNames(character);
  const featSnapshotsByName = new Map(
    (character?.allFeatSnapshots || []).map((feat) => [feat?.name, feat]),
  );
  const featBonusPerLevel = featNames.reduce(
    (sum, name) => sum + featHpBonusPerLevel(name, featSnapshotsByName.get(name)),
    0,
  );
  total += featBonusPerLevel * totalLevel;

  return Math.max(1, total);
}
