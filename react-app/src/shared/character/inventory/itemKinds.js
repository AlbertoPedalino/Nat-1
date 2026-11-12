import { stripSource } from '../../content/nameKeys.js';

// What kind of item this is, in one place. Read off the item's 5etools type
// code with its source and case dropped ('LA|XPHB' -> 'LA'), so every screen
// answers "is it armor? a shield? a ranged weapon?" the same way. Items made
// in the sheet carry the app's own 'weapon' / 'armor' kinds.

// The type codes, by kind.
const WEAPON_CODES = Object.freeze(new Set(['M', 'R']));
const BODY_ARMOR_CODES = Object.freeze(new Set(['LA', 'MA', 'HA']));
const SHIELD_CODE = 'S';
export const ARMOR_OR_SHIELD_CODES = Object.freeze(new Set([...BODY_ARMOR_CODES, SHIELD_CODE]));
// The kinds a custom item can be given in the sheet.
const CUSTOM_WEAPON_CODE = 'WEAPON';
const CUSTOM_ARMOR_CODE = 'ARMOR';
// A weapon or armor of any origin (the 5etools codes and the custom kinds).
export const ANY_WEAPON_CODES = Object.freeze(new Set([...WEAPON_CODES, CUSTOM_WEAPON_CODE]));
export const ANY_ARMOR_CODES = Object.freeze(new Set([...ARMOR_OR_SHIELD_CODES, CUSTOM_ARMOR_CODE]));
// Ammunition (Arrow, Firearm bullet).
const AMMO_CODES = Object.freeze(new Set(['A', 'AF']));
// Held or worn while it works: weapons, armor and shields, spellcasting
// focuses (wand, rod, staff, focus).
const HELD_OR_WORN_CODES = Object.freeze(new Set([...ANY_WEAPON_CODES, ...ANY_ARMOR_CODES, 'WD', 'RD', 'ST', 'SCF']));
// What the inventory lets you equip: held or worn, and wondrous items.
const EQUIPPABLE_CODES = Object.freeze(new Set([...HELD_OR_WORN_CODES, 'WI']));

// An item's type code without its source, upper case ('M|XPHB' -> 'M').
export function itemBaseType(item) {
  return stripSource(item?.type).toUpperCase();
}

const is = (codes) => (item) => codes.has(itemBaseType(item));

// A 5etools melee or ranged weapon.
export const isWeaponItem = is(WEAPON_CODES);
export const isMeleeWeapon = (item) => itemBaseType(item) === 'M';
export const isRangedWeapon = (item) => itemBaseType(item) === 'R';
// Light, medium or heavy armor (not a shield).
export const isBodyArmor = is(BODY_ARMOR_CODES);
export const isHeavyArmor = (item) => itemBaseType(item) === 'HA';
export const isShield = (item) => itemBaseType(item) === SHIELD_CODE;
export const isArmorOrShield = is(ARMOR_OR_SHIELD_CODES);
export const isAmmo = is(AMMO_CODES);
export const isHeldOrWorn = is(HELD_OR_WORN_CODES);
export const isEquippable = is(EQUIPPABLE_CODES);
