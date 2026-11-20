import { HAND_SLOTS, OFF_HAND_SLOT, TWO_HANDS_SLOT } from '../../../shared/character/inventory/itemContainers.js';
import { getMod, getFinal, getPB } from '../../../shared/character/sheet/sheetStats.js';
import { adapterRegistry } from '../../../adapters/registry.js';
import { getWeaponProficiencyInfo, hasNonProficientArmor } from '../../../shared/character/proficiency/proficiencyQueries.js';
import {
  collectResolvedWeaponMasteries,
  findWeaponItemByName,
  normalizeWeaponName,
  resolveWeaponMasteryForItem,
} from '../../../shared/character/combat/weaponMastery.js';
import { getOneHandDamageDice, getWeaponDamageDice, canUseLightExtraAttack, getOffHandDamageMod, hasTwoWeaponFightingStyle, isTwoHandedWeapon, isThrownWeapon, isHeavyWeapon, isWieldingWeaponOrShield, isLightWeapon, isFinesseWeapon, isCrossbow, isPolearmMasterWeapon, hasEquippedShield } from '../inventory/equipmentSlots.js';
import { weaponEnhancement, weaponExtraDamage } from '../../../shared/character/inventory/itemBonus.js';
import { isItemEffectActive } from '../../../shared/character/inventory/itemAttunement.js';
import { matchesItemReference } from '../../../shared/character/inventory/itemIdentity.js';
import {
  itemCardName,
  itemPickOptions,
  replicatedItemProperty,
} from '../../../shared/character/inventory/replicateMagicItem.js';
import {
  getMeleeStrDamageBonus,
  getUnarmedStrike,
  getWeaponEffectBonuses,
  getWeaponNotes,
} from '../../../shared/character/sheet/effectBonuses.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';
import { isMeleeWeapon, isRangedWeapon, isWeaponItem, itemBaseType } from '../../../shared/character/inventory/itemKinds.js';
import { hasItemFlag, itemFlagWeaponDice } from '../../../shared/character/inventory/itemFlags.js';

// Action cards for weapons: one per wielded weapon (main hand, off hand,
// thrown, two-handed), with ability, proficiency, mastery, fighting-style and
// item bonuses, notes and extra attacks; the Unarmed Strike; the weapon picker
// and attack of spells made with a weapon (True Strike); and Weapon Mastery
// reminders.

function weaponAbility(C, item, weaponOverride) {
  if (weaponOverride?.ability) return weaponOverride.ability;
  const override = matchingWeaponOverride(C, item, adapterRegistry.getWeaponAbilityOverrides());
  return override ? override.ability : baseWeaponAbility(C, item);
}

// The ability a weapon uses by the rules alone: Dexterity for a ranged
// weapon, the better of Strength and Dexterity for a finesse one.
function baseWeaponAbility(C, item) {
  if (isRangedWeapon(item)) return 'dex';
  if (isFinesseWeapon(item)) return getMod(getFinal(C, 'dex')) > getMod(getFinal(C, 'str')) ? 'dex' : 'str';
  return 'str';
}

function weaponDamageType(item) {
  return item?.damage?.[0]?.type || item?.dmgType || '';
}

// A weapon's card is titled with the weapon itself. The rule a replicated plan
// adds to it (Repeating Shot) is a tag and a block in the expanded card, not a
// suffix on the name: "Light Crossbow", tagged Repeating Shot.
function weaponCardName(item) {
  return { name: itemCardName(item, 'Weapon'), property: replicatedItemProperty(item) };
}

// The weapon's own kind, for weapon-scoped effects and notes (WEAPON_FILTERS).
// How it is held (one or two hands, alone or not) is the caller's to add.
function weaponKindInfo(item, ctx = {}) {
  return {
    ranged: isRangedWeapon(item),
    melee: isMeleeWeapon(item),
    thrown: isThrownWeapon(item),
    heavy: isHeavyWeapon(item),
    finesse: isFinesseWeapon(item),
    light: isLightWeapon(item),
    crossbow: isCrossbow(item),
    polearm: isPolearmMasterWeapon(item),
    shield: !!ctx.shieldEquipped,
  };
}

function matchingWeaponOverride(C, item, overrides) {
  const type = itemBaseType(item);
  return overrides.find((o) => {
    if (o.weaponTypes && !o.weaponTypes.includes(type)) return false;
    if (o.itemFlag && !hasItemFlag(item, o.itemFlag)) return false;
    if (typeof o.condition === 'function' && !o.condition(C)) return false;
    return true;
  }) || null;
}

// What the attacks with weapons share: Rage-like damage, how many weapons are
// in hand ("solo weapon" = exactly one, any hand slot or equipped with no
// explicit slot: Dueling's "no other weapons"; a Shield is not a weapon, so
// sword-and-board still qualifies) and whether a Shield is.
function weaponContext(C, inventory) {
  return {
    strMeleeDamageBonus: getMeleeStrDamageBonus(C),
    wieldedWeaponCount: (inventory || []).filter((i) => isWeaponItem(i) && isHeldWeapon(i)).length,
    shieldEquipped: hasEquippedShield(inventory),
  };
}

// A weapon as it is held, for weapon-scoped effects and notes (Fighting
// Styles, Great Weapon Master). A weapon readied to throw is not among those
// wielded, but it is in hand alongside them once drawn. An off-hand attack
// always has a second weapon beside it: never one-handed alone (no Dueling),
// while ranged/thrown bonuses (Archery, Thrown Weapon) still resolve.
function heldWeaponInfo(item, ctx, { offHand = false } = {}) {
  const twoHanded = !offHand && (item?.equippedSlot === TWO_HANDS_SLOT || isTwoHandedWeapon(item));
  return {
    ...weaponKindInfo(item, ctx),
    twoHanded,
    oneHanded: !offHand && !twoHanded,
    soloWeapon: !offHand && ctx.wieldedWeaponCount + (isHeldWeapon(item) ? 0 : 1) <= 1,
  };
}

// Rage Damage (and similar, getMeleeStrDamageBonus): Strength-based melee
// attacks only, with a weapon or an Unarmed Strike.
function strMeleeDamage(ctx, ability, melee) {
  return ability === 'str' && melee ? (ctx.strMeleeDamageBonus || 0) : 0;
}

// The numbers of one attack with a weapon, the same on its card, its off-hand
// card and through a spell (True Strike). Attack: ability modifier + magic
// bonus + style bonus (proficiency is the caller's). Damage, one roll: the
// weapon's dice, the dice its flags add (Arcane Firearm's 1d8), the spell's
// own dice, then ability modifier (`damageAbilityMod` when the off hand drops
// it) + magic bonus + Rage + style bonus.
function weaponAttackNumbers(C, item, { ability, dice, extraDice = '', damageAbilityMod, info, ctx }) {
  const mod = getMod(getFinal(C, ability));
  const enhancement = weaponEnhancement(item);
  const style = getWeaponEffectBonuses(C, info);
  const rage = strMeleeDamage(ctx, ability, !isRangedWeapon(item));
  const flagDice = dice ? itemFlagWeaponDice(item, adapterRegistry.getAllItemFlagDefs(), C) : '';
  const allDice = [dice, flagDice, extraDice].filter(Boolean).join('+');
  const flat = (damageAbilityMod ?? mod) + enhancement.damage + rage + style.damage;
  return {
    enhancement,
    attack: mod + enhancement.attack + style.attack,
    damageFormula: allDice ? withModifier(allDice, flat) : '',
  };
}

// XPHB 2024 Heavy property: Disadvantage on attack rolls with both Strength
// and Dexterity under 13.
function heavyWeaponDisadvantage(C, item) {
  return isHeavyWeapon(item) && getFinal(C, 'str') < 13 && getFinal(C, 'dex') < 13;
}

// The mastery chosen for this weapon (Weapon Mastery), read off the choice,
// the weapon itself, or its base item in the database; null when none.
function selectedWeaponMastery(item, selectedMasteriesByWeapon, items) {
  const selectedEntry = selectedMasteriesByWeapon.get(normalizeWeaponName(item?.name || '')) || null;
  if (!selectedEntry) return null;
  const directMastery = resolveWeaponMasteryForItem(item);
  const dbItem = directMastery ? null : findWeaponItemByName(items, item?.name || '', item?.source || '');
  return selectedEntry.mastery || directMastery || resolveWeaponMasteryForItem(dbItem) || null;
}

function isHeldWeapon(item) {
  return HAND_SLOTS.includes(item?.equippedSlot) || Boolean(item?.equipped && !item?.equippedSlot);
}

// The weapons True Strike can be cast through, one per distinct weapon
// (itemPickOptions): its material component is "a weapon with which you have
// proficiency". The ones in hand come first.
export function spellWeaponOptions(C, inventory, profSets) {
  const overrides = adapterRegistry.getWeaponAbilityOverrides();
  const weapons = (inventory || [])
    .filter((item) => isWeaponItem(item)
      && getWeaponProficiencyInfo(C, item, matchingWeaponOverride(C, item, overrides), profSets).proficient)
    .sort((a, b) => Number(isHeldWeapon(b)) - Number(isHeldWeapon(a)));
  return itemPickOptions(weapons).map((option) => ({ ...option, held: isHeldWeapon(option.item) }));
}

// One attack with a weapon, made through a spell that swaps Strength or
// Dexterity for the spellcasting ability (True Strike). Everything else is the
// weapon's own (weaponAttackNumbers) plus the Heavy property's Disadvantage.
// `extraDamage` is the spell's own dice, added to the one damage roll of the
// hit: weapon die + flag dice + spell dice + modifier.
export function spellWeaponAttack(C, item, { ability, inventory, extraDamage = '' } = {}) {
  if (!item) return null;
  const ctx = weaponContext(C, inventory);
  const numbers = weaponAttackNumbers(C, item, {
    ability,
    dice: getWeaponDamageDice(item, item.equippedSlot),
    extraDice: extraDamage,
    info: heldWeaponInfo(item, ctx),
    ctx,
  });
  return {
    name: weaponCardName(item).name,
    attackBonus: getPB(C) + numbers.attack,
    damageFormula: numbers.damageFormula,
    damageType: weaponDamageType(item),
    extraRollers: weaponExtraDamageRollers(item),
    disadvantage: heavyWeaponDisadvantage(C, item),
  };
}

// The extra damage a weapon's text adds on a hit (Frostmourne's +2d12 Cold),
// one button each, rolled when it applies: on its attack card and on an
// attack made with it through a spell (True Strike).
export function weaponExtraDamageRollers(item) {
  return weaponExtraDamage(item).map(({ formula, type }) => ({
    key: `extra-${formula}-${type}`, kind: 'damage', formula, label: `+${formula} ${type}`,
  }));
}

// A weapon card's damage buttons: the weapon's damage, then its extra damage.
function weaponDamageRollers(item, damageFormula, damageType) {
  return [
    { kind: 'damage', formula: damageFormula, label: damageFormula ? `Damage ${damageFormula}${damageType ? ` ${damageType}` : ''}` : 'Damage' },
    ...weaponExtraDamageRollers(item),
  ];
}

// A weapon's attack card. `offHand` ({ twf }) makes it the Light property's
// extra attack with the off-hand weapon: one-handed die, no ability modifier
// to damage unless negative or with Two-Weapon Fighting, a Bonus Action (an
// Action with the Nick mastery).
function makeWeaponAction(C, item, index, overrides, selectedMasteriesByWeapon, items, ctx, { offHand = null } = {}) {
  const { profSets, untrainedArmor } = ctx;
  const weaponOverride = matchingWeaponOverride(C, item, overrides);
  const profInfo = getWeaponProficiencyInfo(C, item, weaponOverride, profSets);
  const ability = weaponAbility(C, item, weaponOverride);
  const overrideBlocked = weaponOverride?.requiresProficiency && !profInfo.proficient;
  const finalAbility = overrideBlocked ? baseWeaponAbility(C, item) : ability;
  const info = heldWeaponInfo(item, ctx, { offHand: Boolean(offHand) });
  const numbers = weaponAttackNumbers(C, item, {
    ability: finalAbility,
    dice: offHand ? getOneHandDamageDice(item) : getWeaponDamageDice(item, item.equippedSlot),
    damageAbilityMod: offHand ? getOffHandDamageMod(getMod(getFinal(C, finalAbility)), offHand.twf) : undefined,
    info,
    ctx,
  });
  const { enhancement } = numbers;
  const disAdv = (untrainedArmor && (finalAbility === 'str' || finalAbility === 'dex')) || heavyWeaponDisadvantage(C, item);
  const mastery = selectedWeaponMastery(item, selectedMasteriesByWeapon, items);
  const card = weaponCardName(item);
  return {
    name: card.name,
    cat: offHand && mastery !== 'Nick' ? 'bonus' : 'action',
    _source: 'Weapon',
    _weaponAttack: true,
    attackBonus: (profInfo.proficient ? getPB(C) : 0) + numbers.attack,
    rollers: weaponDamageRollers(item, numbers.damageFormula, weaponDamageType(item)),
    rollLabelPrefix: offHand ? `Off-hand ${card.name}` : card.name,
    noDescription: true,
    _item: item,
    _enhancement: enhancement.attack || enhancement.damage ? enhancement : null,
    _weaponIndex: index,
    _weaponMastery: mastery || null,
    _weaponNotes: getWeaponNotes(C, info),
    _itemProperty: card.property,
    _weaponSlot: item.equippedSlot || null,
    _colorBarCat: 'attack',
    _notProficient: !profInfo.proficient,
    _disadvantage: disAdv,
  };
}

// Clone a weapon's attack card for each registered extra-attack override that
// matches it (e.g. Scimitar of Speed → a Bonus Action attack). Reuses the
// computed attack/damage so item enhancement, mastery and proficiency stay
// consistent; only category/label change.
function pushWeaponExtraAttacks(out, mainAction, item, C, overrides) {
  if (!isItemEffectActive(item)) return;
  overrides.forEach((ov) => {
    if (!matchesItemReference(item, ov.item)) return;
    if (typeof ov.condition === 'function') {
      let allowed = false;
      try { allowed = ov.condition(C, item); } catch { allowed = false; }
      if (!allowed) return;
    }
    out.push({
      ...mainAction,
      name: ov.name || mainAction.name,
      cat: ov.cat || 'bonus',
      _colorBarCat: 'attack',
      _extraAttackKey: ov.key,
    });
  });
}

export function makeWeaponActions(C, attacks, inventory, items = [], equipmentSets, ruleEntries = {}) {
  if (!equipmentSets) {
    throw new Error('makeWeaponActions requires equipmentSets from collectEquipmentProficiencySets(character)');
  }
  const overrides = adapterRegistry.getWeaponAbilityOverrides();
  const selectedMasteriesByWeapon = new Map(
    collectResolvedWeaponMasteries(C, items)
      .map((entry) => [normalizeWeaponName(entry.weaponName), entry])
      .filter(([name]) => !!name),
  );

  const ctx = {
    ...weaponContext(C, inventory),
    profSets: equipmentSets,
    untrainedArmor: hasNonProficientArmor(C, inventory, equipmentSets),
  };

  const weaponActions = [];
  const hasTWF = hasTwoWeaponFightingStyle(C);
  const offHandItem = attacks.find(i => i.equippedSlot === OFF_HAND_SLOT);
  const canLightExtra = offHandItem && canUseLightExtraAttack(C, inventory);
  const extraAttackOverrides = adapterRegistry.getWeaponExtraAttacks();

  attacks.forEach((item) => {
    if (item.equippedSlot === OFF_HAND_SLOT && canLightExtra) return;
    const mainAction = makeWeaponAction(C, item, attacks.indexOf(item), overrides, selectedMasteriesByWeapon, items, ctx);
    weaponActions.push(mainAction);
    pushWeaponExtraAttacks(weaponActions, mainAction, item, C, extraAttackOverrides);
  });

  if (canLightExtra && offHandItem) {
    weaponActions.push(makeWeaponAction(
      C, offHandItem, attacks.indexOf(offHandItem), overrides, selectedMasteriesByWeapon, items, ctx,
      { offHand: { twf: hasTWF } },
    ));
  }

  // Die, Dexterity and label come from the features that change the Unarmed
  // Strike (Martial Arts, Unarmed Fighting, Tavern Brawler…), declared in their
  // adapters as `unarmedStrike` effects.
  const unarmed = getUnarmedStrike(C, { emptyHanded: !isWieldingWeaponOrShield(inventory) });
  const useDexUnarmed = unarmed.dexterity && getMod(getFinal(C, 'dex')) > getMod(getFinal(C, 'str'));
  const ability = useDexUnarmed ? 'dex' : 'str';
  const mod = getMod(getFinal(C, ability));
  const unarmedDmgMod = mod + strMeleeDamage(ctx, ability, true);
  const die = unarmed.face > 1 ? `1d${unarmed.face}` : '1';
  const unarmedDamageFormula = withModifier(die, unarmedDmgMod);
  weaponActions.push({
    name: 'Unarmed Strike',
    cat: 'action',
    _colorBarCat: 'attack',
    _weaponAttack: true,
    _source: 'Basic',
    attackBonus: getPB(C) + mod,
    rollers: [{
      kind: 'damage',
      formula: unarmedDamageFormula,
    }],
    rollLabelPrefix: 'Unarmed Strike',
    entries: ruleEntries.unarmedStrike || null,
    _weaponNotes: getWeaponNotes(C, { unarmed: true }),
  });
  return weaponActions;
}
