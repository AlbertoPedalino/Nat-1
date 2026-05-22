// Normalize 5etools `attachedSpells` field from an item into a flat list of
// spell grants consumed by the spell pipeline. Each grant carries the spell
// name and a free-cast definition shape (max uses + recharge) when applicable
// so the existing free-cast machinery (display, rest reset, toggle) handles
// item-granted spells with zero spell-system code change.
//
// 5etools `attachedSpells` shapes:
//   ["spell|src", ...]                       → at-will list
//   {will: ["spell|src", ...]}               → at-will
//   {daily: {"1": [...]}, "1e": [...]}}      → N per long rest; "Ne" = each
//   {limited: {"N": [...]}}                  → N total uses (treated as LR)
//   {ritual: [...]}                          → ritual only (display flag)
//   {other: [...]}                           → context-specific (at-will UI)
//
// Spell names come as "name|source"; strip the source suffix and lower-case
// for normalization.

import { isItemBonusActive } from './itemBonus.js';

function stripSpellRef(raw) {
  if (raw == null) return { name: '', source: '' };
  const text = String(raw).trim();
  if (!text) return { name: '', source: '' };
  const [namePart, sourcePart] = text.split('|');
  return {
    name: (namePart || '').trim(),
    source: (sourcePart || '').trim(),
  };
}

function pushGrants(out, list, usage, max, perEach, ritual) {
  if (!Array.isArray(list)) return;
  list.forEach((raw) => {
    const { name, source: spellSource } = stripSpellRef(raw);
    if (!name) return;
    out.push({
      name,
      spellSource,
      usage,
      max,
      perEach,
      ritual: !!ritual,
    });
  });
}

function parseDailyKey(key) {
  const text = String(key || '').toLowerCase();
  const match = text.match(/^(\d+)(e)?$/);
  if (!match) return null;
  return { count: Number(match[1]) || 1, perEach: !!match[2] };
}

export function parseAttachedSpells(attachedSpells) {
  const out = [];
  if (!attachedSpells) return out;

  if (Array.isArray(attachedSpells)) {
    pushGrants(out, attachedSpells, 'will', Infinity, true, false);
    return out;
  }

  if (typeof attachedSpells !== 'object') return out;

  if (Array.isArray(attachedSpells.will)) {
    pushGrants(out, attachedSpells.will, 'will', Infinity, true, false);
  }
  if (Array.isArray(attachedSpells.other)) {
    pushGrants(out, attachedSpells.other, 'other', Infinity, true, false);
  }
  if (Array.isArray(attachedSpells.ritual)) {
    pushGrants(out, attachedSpells.ritual, 'ritual', Infinity, true, true);
  }

  if (attachedSpells.daily && typeof attachedSpells.daily === 'object') {
    Object.entries(attachedSpells.daily).forEach(([key, list]) => {
      const parsed = parseDailyKey(key);
      if (!parsed) return;
      pushGrants(out, list, 'daily', parsed.count, parsed.perEach, false);
    });
  }
  if (attachedSpells.limited && typeof attachedSpells.limited === 'object') {
    Object.entries(attachedSpells.limited).forEach(([key, list]) => {
      const parsed = parseDailyKey(key);
      if (!parsed) return;
      pushGrants(out, list, 'limited', parsed.count, parsed.perEach, false);
    });
  }

  return out;
}

// Translate a parsed grant into the shape expected by spellFreeCasts.
//   - at-will (`will`, `other`, `ritual`): no free-cast slot (Infinity uses)
//   - daily / limited: long-rest-recharging free cast with max=count
function toFreeCastTemplate(grant) {
  if (grant.usage === 'will' || grant.usage === 'other' || grant.usage === 'ritual') return null;
  if (!Number.isFinite(grant.max) || grant.max <= 0) return null;
  return {
    maxUses: grant.max,
    recharge: 'longRest',
    canAlsoUseSlots: false,
  };
}

// Walk equipped+attuned inventory, returning all spell grants tagged with the
// originating item name. Consumer (spellsTabLogic) pushes each row into the
// spell list with the item label as `source`.
export function collectItemAttachedSpells(C) {
  const inventory = C?.inventory || [];
  const out = [];

  inventory.forEach((item) => {
    if (!isItemBonusActive(item)) return;
    if (!item.attachedSpells) return;

    const grants = parseAttachedSpells(item.attachedSpells);
    grants.forEach((grant) => {
      const freeCastTpl = toFreeCastTemplate(grant);
      out.push({
        name: grant.name,
        source: {
          label: item.name || 'Item',
          color: '#edd48a',
          originType: 'item',
          originLabel: item.name || 'Item',
        },
        ritual: grant.ritual,
        usage: grant.usage,
        max: grant.max,
        perEach: grant.perEach,
        itemName: item.name || '',
        freeCastTemplate: freeCastTpl,
      });
    });
  });

  return out;
}
