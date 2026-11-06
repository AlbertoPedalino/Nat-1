import { stripSource } from './nameKeys.js';
import { ABILITY_NAMES } from './rulesVocabulary.js';

// The words a 2024 stat block prints for 5etools' label tags: {@atkr m} is
// "Melee Attack Roll:", {@actSave con} "Constitution Saving Throw:", {@h}
// "Hit: " and so on ({@h} and {@hom} run straight into their text, so their
// words carry the space). Every renderer of monster, beast and spell prose reads them
// from here; rolls ({@hit}, {@damage}) and links stay with each renderer.

const ATTACK_ROLLS = { m: 'Melee', r: 'Ranged' };
const ATTACK_KINDS = {
  mw: 'Melee Weapon', rw: 'Ranged Weapon', ms: 'Melee Spell', rs: 'Ranged Spell',
};
const ORDINALS = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth'];
const FIXED = {
  h: 'Hit: ',
  hom: 'Hit or Miss: ',
  actsavesuccess: 'Success:',
  actsavesuccessorfail: 'Failure or Success:',
  acttrigger: 'Trigger:',
  actresponse: 'Response:',
};

function orList(arg, names) {
  const words = String(arg || '').split(',').map((code) => names[code.trim().toLowerCase()]).filter(Boolean);
  return words.join(' or ');
}

// The text for a label tag (lowercase name, first argument), or null when the
// tag is not a label tag.
export function statBlockTagText(tag, arg = '') {
  const value = stripSource(arg);
  if (FIXED[tag]) return FIXED[tag];
  switch (tag) {
    case 'atkr': {
      const kinds = orList(value, ATTACK_ROLLS);
      return `${kinds ? `${kinds} ` : ''}Attack Roll:`;
    }
    case 'atk': {
      const kinds = orList(value, ATTACK_KINDS);
      return `${kinds ? `${kinds} ` : ''}Attack:`;
    }
    case 'actsave':
      return `${ABILITY_NAMES[value.toLowerCase()] || value} Saving Throw:`;
    case 'actsavefail':
      return value ? `${ORDINALS[Number(value)] || value} Failure:` : 'Failure:';
    case 'actsavefailby':
      return `Failure by ${value} or More:`;
    case 'dc':
      return value ? `DC ${value}` : null;
    case 'recharge':
      return value ? `(Recharge ${value}-6)` : '(Recharge 6)';
    default:
      return null;
  }
}

// Label tags a stat block sets in italics (the lead-in of an attack, save or
// trigger); DC and Recharge read as plain text.
export function isStatBlockLeadIn(tag) {
  return tag !== 'dc' && tag !== 'recharge';
}
