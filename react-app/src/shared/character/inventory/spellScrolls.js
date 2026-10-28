import { ITEM_ATTUNEMENT } from '../../ui/entityColors.js';
import { canStackInventoryItems } from './itemIdentity.js';

// Spell Scrolls (XDMG 2024). A scroll holds one spell of its own level; the
// player writes which one on the inventory entry (`scrollSpell`). The spell is
// then cast from the Spells tab, tagged as an item, and its saving throws and
// attack rolls use the scroll's numbers rather than the reader's: the ones its
// scribe wrote in (`scrollDc`, `scrollAttack`, XPHB "Scribing Spell Scrolls"),
// or a found scroll's fixed ones.

// [save DC, attack bonus] by scroll level, cantrip first (XDMG "Spell Scroll").
const SCROLL_STATS = [
  [13, 5], [13, 5], [13, 5], [15, 7], [15, 7], [17, 9], [17, 9], [18, 10], [18, 10], [19, 11],
];

export function spellScrollLevel(item) {
  const level = item?.spellScrollLevel;
  return Number.isInteger(level) && level >= 0 && level <= 9 ? level : null;
}

export function scrollSpellStats(level) {
  const [dc, attack] = SCROLL_STATS[level] || SCROLL_STATS[0];
  return { dc, attack };
}

// The numbers a scroll's spell uses: those typed on it, else the fixed ones.
export function scrollStatsOf(item) {
  const fixed = scrollSpellStats(spellScrollLevel(item) ?? 0);
  const typed = (value) => (Number.isInteger(value) ? value : null);
  return { dc: typed(item?.scrollDc) ?? fixed.dc, attack: typed(item?.scrollAttack) ?? fixed.attack };
}

// What sets a scroll's spell row apart from the same spell cast from slots,
// and from another scroll of it written with other numbers.
export function scrollRowKey(scroll) {
  return scroll ? `|scroll:${scroll.dc}:${scroll.attack}` : '';
}

// Write on the scroll entry at `index` (its spell, DC, attack; null clears a
// field). A spell is written on one scroll of the stack, which leaves it; its
// numbers belong to every scroll of the entry. A scroll cleared of its spell
// is blank again, numbers included. Whatever comes out joins an entry it now
// matches (another Fireball scroll, the blank stack) instead of standing alone.
export function writeOnScroll(inventory, index, patch) {
  const list = Array.isArray(inventory) ? [...inventory] : [];
  const target = list[index];
  if (!target) return list;
  const written = { ...target };
  Object.entries(patch || {}).forEach(([field, value]) => {
    if (value == null) delete written[field];
    else written[field] = value;
  });
  const respelled = Object.hasOwn(patch || {}, 'scrollSpell');
  if (respelled && !written.scrollSpell) {
    delete written.scrollDc;
    delete written.scrollAttack;
  }
  // The same spell picked again is no change at all.
  if (canStackInventoryItems(target, written)) return list;
  const qty = Math.max(1, Number(target.qty) || 1);
  const moved = respelled ? 1 : qty;
  written.qty = moved;

  const twin = list.findIndex((item, idx) => idx !== index && canStackInventoryItems(item, written));
  if (twin >= 0) list[twin] = { ...list[twin], qty: (Number(list[twin].qty) || 1) + moved };
  if (qty > moved) {
    list[index] = { ...target, qty: qty - moved };
    if (twin < 0) list.splice(index + 1, 0, written);
    return list;
  }
  if (twin >= 0) list.splice(index, 1);
  else list[index] = written;
  return list;
}

// "Spell Scroll (Level 3): Fireball" once a spell is written on it.
export function scrollCardName(item, baseName) {
  const spell = spellScrollLevel(item) != null ? item?.scrollSpell?.name : null;
  return spell ? `${baseName}: ${spell}` : baseName;
}

// The scrolls in the inventory that carry a spell, as grants for the Spells
// tab. Two stacks of the same spell with the same numbers are one row.
export function collectScrollSpells(C) {
  const out = [];
  (C?.inventory || []).forEach((item) => {
    const level = spellScrollLevel(item);
    const spell = item?.scrollSpell;
    if (level == null || !spell?.name) return;
    if ((Number(item.qty ?? 1) || 0) <= 0) return;
    out.push({
      name: spell.name,
      spellSource: spell.source || '',
      level,
      source: {
        label: 'Scroll',
        color: ITEM_ATTUNEMENT,
        originType: 'item',
        originLabel: item.name || 'Spell Scroll',
      },
      scroll: { level, ...scrollStatsOf(item) },
    });
  });
  return out;
}
