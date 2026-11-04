import test from 'node:test';
import assert from 'node:assert/strict';
import { eldritchCannonRuleGroups } from '../../../../../src/shared/character/forms/eldritchCannonForm.js';

const rows = (level) => Object.fromEntries(
  eldritchCannonRuleGroups(5 * level, level).flatMap((group) => group.rows),
);

test('the cannon rules state the tools, the surface and the one-cannon limit', () => {
  const rules = rows(3);
  assert.match(rules.Action, /Smith's or Woodcarver's Tools, on a horizontal surface within 5 ft/);
  assert.equal(rules.Limit, 'One at a time (two from level 15)');
  assert.equal(rules.Defenses, 'AC 18; HP 15; immune Poison/Psychic');
  assert.equal(rules.Cover, undefined);
});

test('Fortified Position adds the second cannon, the shared command and the cover', () => {
  const rules = rows(15);
  assert.equal(rules.Limit, 'Two at a time, both created with the same Magic Action');
  assert.match(rules.Cost, /a slot for each cannon/);
  assert.match(rules.Command, /one Bonus Action activates both/);
  assert.equal(rules.Cover, 'You and your allies within 10 ft of a cannon have Half Cover');
});
