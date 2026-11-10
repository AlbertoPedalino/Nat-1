import {
  ACTION_COLORS,
  CHIP_TONES,
  ENTITY_COLORS,
  ITEM_ATTUNEMENT,
} from '../../../shared/ui/entityColors.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';

export const FILTERS = ['all', 'action', 'bonus', 'reaction', 'special'];

// Weapon/unarmed attacks get a red left-bar so attacks stand apart from other
// Actions at a glance; the rest follow the shared action-economy colours.
export const CAT_COLORS = { ...ACTION_COLORS, attack: UI_COLORS.danger };

export const SECTION_DEFS = [
  { key: 'action', title: 'Actions', cats: ['action', 'attack'] },
  { key: 'bonus', title: 'Bonus Actions', cats: ['bonus'] },
  { key: 'reaction', title: 'Reactions', cats: ['reaction'] },
  { key: 'special', title: 'Other', cats: ['special'] },
];

// Action-tab tags render as MiniBadges — the same primitive the spell tab uses —
// so a tag reads identically across both tabs. Each is keyed by a semantic tone:
// status/fact tones from CHIP_TONES, source tones from an entity-kind colour
// (Wild Shape = class). bg follows the spell-tab convention of a 0.16 tint.
const TAG_TONES = {
  mastery:    CHIP_TONES.mastery,    // active weapon mastery
  noprof:     CHIP_TONES.negative,   // warning: non-proficient
  slot:       CHIP_TONES.info,       // neutral fact: weapon hand
  wildShape:  ENTITY_COLORS.class,   // source: form-granted (class colour)
  weaponNote: ENTITY_COLORS.feat,    // source: feat rule reminder (e.g. GWM)
  itemProperty: ITEM_ATTUNEMENT,     // source: rule an item plan adds (Repeating Shot)
};

// A MiniBadge descriptor ({ key, label, color, bg }) for a semantic tone.
function tagBadge(key, tone, label) {
  const color = TAG_TONES[tone];
  return { key, label, color };
}

export function buildActionTags(action) {
  const tags = [];

  if (action._wildShapeTag) {
    tags.push(tagBadge('wildshape', 'wildShape', 'Wild Shape'));
  }
  if (action._weaponMastery) {
    tags.push(tagBadge('mastery', 'mastery', action._weaponMastery));
  }
  if (action._itemProperty) {
    tags.push(tagBadge('item-property', 'itemProperty', action._itemProperty.tag));
  }
  // One tag per feat: its rules on this weapon share it, and each is spelled
  // out in the expanded card.
  const noteTags = new Set();
  (action._weaponNotes || []).forEach((note) => {
    if (!note.tag || noteTags.has(note.tag)) return;
    noteTags.add(note.tag);
    tags.push(tagBadge(`note-${note.key}`, 'weaponNote', note.tag));
  });
  if (action._notProficient) {
    tags.push(tagBadge('noprof', 'noprof', 'No Prof'));
  }
  if (action._weaponSlot) {
    tags.push(tagBadge('slot', 'slot', action._weaponSlot));
  }

  // No adapter "fact" chips: what is fixed (area, duration, save DC, a THP or
  // damage amount) is read from the card's text, as for Grapple or Shove;
  // what is rolled (attack, damage, healing, Temporary HP) is a roller.
  return { ...action, tags };
}
