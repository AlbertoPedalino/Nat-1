import { ITEM_ATTUNEMENT } from '../../ui/entityColors.js';

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
