import test from 'node:test';
import assert from 'node:assert/strict';
import { classIcon } from '../../../../../src/shared/character/profile/classIcon.js';
import { CLASS_ICONS, FALLBACK_CLASS_ICON, TOOL_ICONS } from '../../../../../src/shared/ui/gameIcons.js';

const CLASSES = [
  'Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue',
  'Sorcerer', 'Warlock', 'Wizard',
  // The World of Warcraft book's own classes.
  'Death Knight', 'Demon Hunter', 'Evoker', 'Hunter', 'Mage', 'Priest', 'Shaman', 'Warrior',
];

test('every class has a mark of its own, read whatever the case or spacing', () => {
  const marks = CLASSES.map((name) => classIcon(` ${name.toUpperCase()} `));
  assert.equal(marks.includes(FALLBACK_CLASS_ICON), false);
  assert.equal(new Set(marks).size, CLASSES.length);
});

test('a class mark is never a tool mark', () => {
  const tools = new Set(Object.values(TOOL_ICONS));
  assert.deepEqual(Object.entries(CLASS_ICONS).filter(([, icon]) => tools.has(icon)).map(([name]) => name), []);
});

test('an unknown class takes the fallback mark', () => {
  assert.equal(classIcon('Mystic'), FALLBACK_CLASS_ICON);
  assert.equal(classIcon(''), FALLBACK_CLASS_ICON);
});
