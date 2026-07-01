import { weaponMatchesRule } from './proficiencies.js';
import { classLevel } from '../../../shared/character/classLevel.js';

export const BLADESONG_ELIGIBILITY_RULE = {
  type: "M",
  category: "martial",
  excludeProperties: ["heavy", "two-handed"],
};

function bladesingerSubclasses() {
  return new Set(['bladesinger', 'bladesinging']);
}

function isWizardBladesingerAtLevel(C, level) {
  if (!C) return false;
  const subs = bladesingerSubclasses();
  const sub = String(C?.subclassShortName || '').toLowerCase();
  if (subs.has(sub) && classLevel(C, 'Wizard') >= level) return true;
  return (C?.extraClasses || []).some(ec =>
    String(ec?.name || '').toLowerCase() === 'wizard'
    && subs.has(String(ec?.subclassShortName || '').toLowerCase())
    && (ec?.level || 1) >= level
  );
}

export function isBladesingerCharacter(C) {
  return isWizardBladesingerAtLevel(C, 3);
}

export function isBladesongEligibleWeapon(item) {
  if (!item || !['M', 'R'].includes(String(item.type || '').toUpperCase())) return false;
  return weaponMatchesRule(item, BLADESONG_ELIGIBILITY_RULE);
}
