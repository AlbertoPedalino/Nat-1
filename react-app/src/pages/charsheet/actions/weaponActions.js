import { getMod, getFinal, getPB } from '../../../shared/character/sheet/sheetStats.js';
import { adapterRegistry } from '../../../adapters/registry.js';
import { getWeaponProficiencyInfo, hasNonProficientArmor } from '../../../shared/character/proficiency/proficiencyQueries.js';
import {
  collectResolvedWeaponMasteries,
  findWeaponItemByName,
  normalizeWeaponName,
  resolveWeaponMasteryForItem,
} from '../../../shared/character/combat/weaponMastery.js';
import { getWeaponDamageDice, canUseLightExtraAttack, getOffHandDamageMod, hasTwoWeaponFightingStyle, isTwoHandedWeapon, isThrownWeapon, isHeavyWeapon, isWieldingWeaponOrShield, isLightWeapon, isFinesseWeapon, isCrossbow, isPolearmMasterWeapon, hasEquippedShield } from '../inventory/equipmentSlots.js';
import { weaponEnhancement, weaponExtraDamage } from '../../../shared/character/inventory/itemBonus.js';
import { isItemEffectActive } from '../../../shared/character/inventory/itemAttunement.js';
import {
  itemIdentityKey,
  matchesItemReference,
} from '../../../shared/character/inventory/itemIdentity.js';
import {
  itemCardName,
  replicatedItemProperty,
} from '../../../shared/character/inventory/replicateMagicItem.js';
import {
  getMeleeStrDamageBonus,
  getUnarmedStrike,
  getWeaponEffectBonuses,
  getWeaponNotes,
} from '../../../shared/character/sheet/effectBonuses.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';
import { isMeleeWeapon, isRangedWeapon, isWeaponItem } from '../../../shared/character/inventory/itemKinds.js';

// Action cards for weapons: one per wielded weapon (main hand, off hand,
// thrown, two-handed), with ability, proficiency, mastery, fighting-style and
// item bonuses, notes and extra attacks; the Unarmed Strike; the weapon picker
// and attack of spells made with a weapon (True Strike); and Weapon Mastery
// reminders.

function weaponAbility(C, item, weaponOverride) {
  if (weaponOverride?.ability) return weaponOverride.ability;
  const type = String(item?.type || '').toUpperCase();
  const overrides = adapterRegistry.getWeaponAbilityOverrides();
  for (const o of overrides) {
    if (o.weaponTypes && !o.weaponTypes.includes(type)) continue;
    if (o.itemFlag && !(item?.flags || []).includes(o.itemFlag)) continue;
    if (typeof o.condition === 'function' && !o.condition(C)) continue;
    return o.ability;
  }
  return baseWeaponAbility(C, item);
}

// The ability a weapon uses by the rules alone: Dexterity for a ranged
// weapon, the better of Strength and Dexterity for a finesse one.
function baseWeaponAbility(C, item) {
  if (isRangedWeapon(item)) return 'dex';
  if (isFinesseWeapon(item)) return getMod(getFinal(C, 'dex')) > getMod(getFinal(C, 'str')) ? 'dex' : 'str';
  return 'str';
}

function weaponDamageBase(item) {
  return item?.damage?.[0]?.damage || item?.dmg1 || item?.damageDice || item?.dmg || '';
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
  const type = String(item?.type || '').toUpperCase();
  return overrides.find((o) => {
    if (o.weaponTypes && !o.weaponTypes.includes(type)) return false;
    if (o.itemFlag && !(item?.flags || []).includes(o.itemFlag)) return false;
    if (typeof o.condition === 'function' && !o.condition(C)) return false;
    return true;
  }) || null;
}

function isHeldWeapon(item) {
  return ['mainHand', 'offHand', 'twoHands'].includes(item?.equippedSlot) || Boolean(item?.equipped && !item?.equippedSlot);
}

// A weapon a spell attacks through (True Strike), told apart from another copy
// of the same weapon only when it is a different item: a replicated plan.
export function spellWeaponKey(item) {
  return `${itemIdentityKey(item)}|${item?.craftedFrom || ''}`;
}

// The weapons True Strike can be cast through — its material component is "a
// weapon with which you have proficiency" — the ones in hand first.
export function spellWeaponOptions(C, inventory, profSets) {
  const overrides = adapterRegistry.getWeaponAbilityOverrides();
  const seen = new Set();
  return (inventory || [])
    .filter((item) => isWeaponItem(item)
      && getWeaponProficiencyInfo(C, item, matchingWeaponOverride(C, item, overrides), profSets).proficient)
    .sort((a, b) => Number(isHeldWeapon(b)) - Number(isHeldWeapon(a)))
    .filter((item) => {
      const key = spellWeaponKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({ key: spellWeaponKey(item), item, name: weaponCardName(item).name, held: isHeldWeapon(item) }));
}

// One attack with a weapon, made through a spell that swaps Strength or
// Dexterity for the spellcasting ability (True Strike). Everything else is the
// weapon's own: its damage die (two-handed when so held), magic bonus, Fighting
// Style bonuses, and the Heavy property's Disadvantage. `extraDamage` is the
// spell's own dice, added to the one damage roll of the hit.
export function spellWeaponAttack(C, item, { ability, inventory, extraDamage = '' } = {}) {
  if (!item) return null;
  const mod = getMod(getFinal(C, ability));
  const enhancement = weaponEnhancement(item);
  const held = (inventory || []).filter((i) => isWeaponItem(i) && isHeldWeapon(i)).length;
  const twoHanded = item.equippedSlot === 'twoHands' || isTwoHandedWeapon(item);
  const info = {
    ...weaponKindInfo(item, { shieldEquipped: hasEquippedShield(inventory) }),
    twoHanded,
    oneHanded: !twoHanded,
    soloWeapon: held <= 1,
  };
  const bonus = getWeaponEffectBonuses(C, info);
  const flat = mod + enhancement.damage + bonus.damage;
  const dice = [getWeaponDamageDice(item, item.equippedSlot), extraDamage].filter(Boolean).join('+');
  const damageFormula = dice ? withModifier(dice, flat) : '';
  return {
    name: weaponCardName(item).name,
    attackBonus: getPB(C) + mod + enhancement.attack + bonus.attack,
    damageFormula,
    damageType: weaponDamageType(item),
    extraRollers: weaponExtraDamageRollers(item),
    disadvantage: isHeavyWeapon(item) && getFinal(C, 'str') < 13 && getFinal(C, 'dex') < 13,
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

function makeWeaponAction(C, item, index, overrides, selectedMasteriesByWeapon, inventory, items, ctx = {}, opts = {}) {
  const { profSets, untrainedArmor } = ctx;
  const weaponOverride = matchingWeaponOverride(C, item, overrides);
  const profInfo = getWeaponProficiencyInfo(C, item, weaponOverride, profSets);
  const ability = weaponAbility(C, item, weaponOverride);
  const overrideBlocked = weaponOverride?.requiresProficiency && !profInfo.proficient;
  const finalAbility = overrideBlocked ? baseWeaponAbility(C, item) : ability;
  const mod = getMod(getFinal(C, finalAbility));
  const enhancement = weaponEnhancement(item);
  const base = opts.damageBase != null ? opts.damageBase : weaponDamageBase(item);
  // Rage Damage (and similar): adds to Strength-based melee weapon attacks only.
  const strMeleeDamageBonus = finalAbility === 'str' && !isRangedWeapon(item) ? (ctx.strMeleeDamageBonus || 0) : 0;
  // Fighting Style and similar weapon-scoped bonuses (Archery, Dueling, Thrown Weapon)
  // plus weapon-scoped rule reminders (Great Weapon Master) share one weapon profile.
  const wieldedTwoHanded = item?.equippedSlot === 'twoHands' || isTwoHandedWeapon(item);
  const isHeavy = isHeavyWeapon(item);
  const weaponInfo = {
    ...weaponKindInfo(item, ctx),
    twoHanded: wieldedTwoHanded,
    oneHanded: !wieldedTwoHanded,
    // A weapon readied to throw is not among those wielded, but it is in hand
    // alongside them once drawn.
    soloWeapon: ctx.wieldedWeaponCount + (isHeldWeapon(item) ? 0 : 1) <= 1,
  };
  const fsBonus = getWeaponEffectBonuses(C, weaponInfo);
  const weaponNotes = getWeaponNotes(C, weaponInfo);
  const finalMod = (opts.damageMod != null ? opts.damageMod : mod) + enhancement.damage + strMeleeDamageBonus + fsBonus.damage;
  const damageFormula = base ? withModifier(base, finalMod) : '';
  const dtype = weaponDamageType(item);
  // XPHB 2024 Heavy weapon: Disadvantage on attack rolls if both STR and DEX < 13.
  const heavyUnderStat = isHeavy && getFinal(C, 'str') < 13 && getFinal(C, 'dex') < 13;
  const disAdv = (untrainedArmor && (finalAbility === 'str' || finalAbility === 'dex')) || heavyUnderStat;
  const selectedEntry = selectedMasteriesByWeapon.get(normalizeWeaponName(item?.name || '')) || null;
  const directMastery = selectedEntry ? resolveWeaponMasteryForItem(item) : null;
  const dbItem = selectedEntry && !directMastery
    ? findWeaponItemByName(items, item?.name || '', item?.source || '')
    : null;
  const mastery = selectedEntry
    ? (selectedEntry.mastery || directMastery || resolveWeaponMasteryForItem(dbItem))
    : null;
  const card = weaponCardName(item);
  return {
    name: opts.name || card.name,
    cat: opts.cat || 'action',
    _source: 'Weapon',
    _weaponAttack: true,
    attackBonus: (profInfo.proficient ? getPB(C) + mod : mod) + enhancement.attack + fsBonus.attack,
    rollers: weaponDamageRollers(item, damageFormula, dtype),
    rollLabelPrefix: opts.rollLabelPrefix || card.name,
    noDescription: true,
    _item: item,
    _enhancement: enhancement.attack || enhancement.damage ? enhancement : null,
    _weaponIndex: index,
    _weaponMastery: mastery || null,
    _weaponNotes: weaponNotes,
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

  const untrainedArmor = hasNonProficientArmor(C, inventory, equipmentSets);
  // "Solo weapon" = exactly one weapon wielded (any hand slot, or equipped with no
  // explicit slot). Gates Fighting Style: Dueling ("a melee weapon in one hand and
  // no other weapons"); a Shield is not a weapon, so sword-and-board still qualifies.
  const wieldedWeaponCount = (inventory || []).filter((i) =>
    isWeaponItem(i) && (['mainHand', 'offHand', 'twoHands'].includes(i.equippedSlot) || (i.equipped && !i.equippedSlot)),
  ).length;
  const ctx = {
    profSets: equipmentSets,
    untrainedArmor,
    strMeleeDamageBonus: getMeleeStrDamageBonus(C),
    wieldedWeaponCount,
    shieldEquipped: hasEquippedShield(inventory),
  };

  const weaponActions = [];
  const hasTWF = hasTwoWeaponFightingStyle(C);
  const offHandItem = attacks.find(i => i.equippedSlot === 'offHand');
  const canLightExtra = offHandItem && canUseLightExtraAttack(C, inventory);
  const extraAttackOverrides = adapterRegistry.getWeaponExtraAttacks();

  attacks.forEach((item) => {
    if (item.equippedSlot === 'offHand' && canLightExtra) return;
    const base = getWeaponDamageDice(item, item.equippedSlot);
    const mainAction = makeWeaponAction(C, item, attacks.indexOf(item), overrides, selectedMasteriesByWeapon, inventory, items, ctx, { damageBase: base });
    weaponActions.push(mainAction);
    pushWeaponExtraAttacks(weaponActions, mainAction, item, C, extraAttackOverrides);
  });

  if (canLightExtra && offHandItem) {
    const ohIndex = attacks.indexOf(offHandItem);
    const ohOverride = matchingWeaponOverride(C, offHandItem, overrides);
    const ohProfInfo = getWeaponProficiencyInfo(C, offHandItem, ohOverride, equipmentSets);
    const ohAbility = weaponAbility(C, offHandItem, ohOverride);
    const ohMod = getMod(getFinal(C, ohAbility));
    const ohEnhancement = weaponEnhancement(offHandItem);
    const ohBase = weaponDamageBase(offHandItem);
    const ohDtype = weaponDamageType(offHandItem);
    const ohStrMeleeDamageBonus = ohAbility === 'str' && !isRangedWeapon(offHandItem) ? ctx.strMeleeDamageBonus : 0;
    // Off-hand implies a second weapon → oneHanded=false so Dueling does not apply;
    // ranged/thrown bonuses (Archery, Thrown Weapon) still resolve.
    const ohWeaponInfo = {
      ...weaponKindInfo(offHandItem, ctx),
      twoHanded: false,
      oneHanded: false,
      soloWeapon: false, // off-hand implies a second weapon → never solo
    };
    const ohFsBonus = getWeaponEffectBonuses(C, ohWeaponInfo);
    const ohDmgMod = getOffHandDamageMod(ohMod, hasTWF) + ohEnhancement.damage + ohStrMeleeDamageBonus + ohFsBonus.damage;
    const ohSelectedEntry = selectedMasteriesByWeapon.get(normalizeWeaponName(offHandItem?.name || '')) || null;
    const ohDirectMastery = ohSelectedEntry ? resolveWeaponMasteryForItem(offHandItem) : null;
    const ohDbItem = ohSelectedEntry && !ohDirectMastery
      ? findWeaponItemByName(items, offHandItem?.name || '', offHandItem?.source || '')
      : null;
    const ohMastery = ohSelectedEntry
      ? (ohSelectedEntry.mastery || ohDirectMastery || resolveWeaponMasteryForItem(ohDbItem))
      : null;
    const isNick = ohMastery === 'Nick';
    const ohDamageFormula = ohBase ? withModifier(ohBase, ohDmgMod) : '';

    const ohCard = weaponCardName(offHandItem);
    weaponActions.push({
      name: ohCard.name,
      cat: isNick ? 'action' : 'bonus',
      _source: 'Weapon',
      _weaponAttack: true,
      _colorBarCat: 'attack',
      attackBonus: (ohProfInfo.proficient ? getPB(C) + ohMod : ohMod) + ohEnhancement.attack + ohFsBonus.attack,
      rollers: weaponDamageRollers(offHandItem, ohDamageFormula, ohDtype),
      rollLabelPrefix: `Off-hand ${ohCard.name}`,
      noDescription: true,
      _item: offHandItem,
      _enhancement: ohEnhancement.attack || ohEnhancement.damage ? ohEnhancement : null,
      _weaponIndex: ohIndex,
      _weaponSlot: offHandItem.equippedSlot || null,
      _weaponMastery: ohMastery || null,
      _weaponNotes: getWeaponNotes(C, ohWeaponInfo),
      _itemProperty: ohCard.property,
      _notProficient: !ohProfInfo.proficient,
      _disadvantage: false,
    });
  }

  // Die, Dexterity and label come from the features that change the Unarmed
  // Strike (Martial Arts, Unarmed Fighting, Tavern Brawler…), declared in their
  // adapters as `unarmedStrike` effects.
  const unarmed = getUnarmedStrike(C, { emptyHanded: !isWieldingWeaponOrShield(inventory) });
  const useDexUnarmed = unarmed.dexterity && getMod(getFinal(C, 'dex')) > getMod(getFinal(C, 'str'));
  const ability = useDexUnarmed ? 'dex' : 'str';
  const mod = getMod(getFinal(C, ability));
  // Rage Damage applies to Strength-based Unarmed Strikes too.
  const unarmedDmgMod = mod + (ability === 'str' ? ctx.strMeleeDamageBonus : 0);
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
