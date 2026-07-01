import { PACT_SLOTS } from '../../pages/charbuilder/constants.js';
import { classLevel } from './classLevel.js';

function getPactSlotsForLevel(level) {
  const row = PACT_SLOTS[Math.min(level, 20)] || {};
  return { count: row.slots || row.n || 0, level: row.level || row.l || 1 };
}

export function getWarlockLevel(C) {
  return classLevel(C, 'Warlock');
}

export function getPactMagicInfo(C) {
  if (!C) return null;
  const warlockLevel = getWarlockLevel(C);
  if (!warlockLevel) return null;
  const pactData = getPactSlotsForLevel(warlockLevel);
  if (!pactData || !pactData.count) return null;
  return {
    hasPactMagic: true,
    warlockLevel,
    pactSlotLevel: pactData.level,
    pactSlotsMax: pactData.count,
  };
}

function getEntryOwnerClass(entry, C) {
  if (entry.ownerClassName) return entry.ownerClassName;
  if (!entry.sourceInfo) return C?.className;
  if (!C) return null;
  const match = (C.extraClasses || []).find((ec) => ec.name === entry.sourceInfo.label);
  return match ? match.name : null;
}

function isArcanumSource(label) {
  if (!label) return false;
  return /^mystic arcanum/i.test(String(label));
}

export function getSpellCastMode(C, entry, pactInfo) {
  if (!entry) return { mode: 'regular', label: null, castLevel: 0, consumes: null };
  if (entry.level === 0) return { mode: 'cantrip', label: 'Cantrip', castLevel: 0, consumes: null };
  if (entry.sourceInfo?.kind === 'atWill' || entry.castingMode === 'at_will') {
    return { mode: 'at_will', label: 'At Will', castLevel: entry.level, consumes: null };
  }

  if (pactInfo && pactInfo.hasPactMagic && entry.level > 0) {
    if (entry.sourceInfo?.label && isArcanumSource(entry.sourceInfo.label)) {
      return { mode: 'regular', label: null, castLevel: entry.castLevel || entry.level, consumes: null };
    }
    const owner = getEntryOwnerClass(entry, C);
    if (owner && String(owner).toLowerCase() === 'warlock') {
      return {
        mode: 'pact_magic',
        label: `Pact Slot Lv. ${pactInfo.pactSlotLevel}`,
        castLevel: pactInfo.pactSlotLevel,
        consumes: { type: 'pact_slot', amount: 1 },
      };
    }
  }

  return { mode: 'regular', label: null, castLevel: entry.castLevel || entry.level || 0, consumes: null };
}
