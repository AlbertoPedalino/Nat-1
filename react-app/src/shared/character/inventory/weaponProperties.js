import { stripSource } from '../../content/nameKeys.js';
// Weapon properties, read one way by every caller: proficiency rules, wielding
// slots, attack ability, Weapon Mastery, Replicate Magic Item.
//
// Items carry 5etools codes in `property` (and sometimes `properties`): "F",
// "2H", "R" (Reach: on a property it never means Ranged), optionally with a
// source ("F|XPHB"), or a full name, or an object { name | abbreviation | id }.
// Each is reduced to one canonical name; a code with no entry here (AF, BF…)
// stays as its lowercase code.

const CANONICAL = {
  f: 'finesse', fin: 'finesse', finesse: 'finesse',
  l: 'light', light: 'light',
  h: 'heavy', heavy: 'heavy',
  v: 'versatile', versatile: 'versatile',
  t: 'thrown', thrown: 'thrown',
  '2h': 'two-handed', 'two-handed': 'two-handed', twohanded: 'two-handed',
  a: 'ammunition', ammunition: 'ammunition',
  ld: 'loading', loading: 'loading',
  r: 'reach', rch: 'reach', reach: 'reach',
  s: 'special', special: 'special',
  rld: 'reload', reload: 'reload',
  n: 'net', net: 'net',
};

export function canonicalProperty(value) {
  const raw = value && typeof value === 'object'
    ? (value.name ?? value.abbreviation ?? value.id)
    : value;
  const key = stripSource(raw ?? '').toLowerCase();
  return CANONICAL[key] || key;
}

// Every property of an item, canonical.
export function itemProperties(item) {
  const raw = [
    ...(Array.isArray(item?.property) ? item.property : []),
    ...(Array.isArray(item?.properties) ? item.properties : []),
  ];
  return raw.map(canonicalProperty).filter(Boolean);
}

// Whether the item has any of `props` (one, or a list; codes or names).
export function itemHasProperty(item, props) {
  const wanted = new Set((Array.isArray(props) ? props : [props]).map(canonicalProperty));
  return itemProperties(item).some((property) => wanted.has(property));
}
