import test from 'node:test';
import assert from 'node:assert/strict';
import {
  candidatesFor, describeGroups, encounterBudget, fillBudget, groupsTotalXp,
} from './roomBudget.js';

const BESTIARY = [
  { name: 'Rat', xp: 10 },
  { name: 'Goblin', xp: 50 },
  { name: 'Hobgoblin', xp: 100 },
  { name: 'Ogre', xp: 450 },
  { name: 'Wight', xp: 1100 },
  { name: 'Troll', xp: 1800 },
  { name: 'Ancient Red Dragon', xp: 62000 },
];

// The engine answers per character, because that is how the table reads it.
test('the budget is the engine\'s number times the party', () => {
  assert.equal(encounterBudget({ xp: 300 }, 4), 1200);
  assert.equal(encounterBudget({ xp: 300 }, 1), 300);
  assert.equal(encounterBudget({ xp: 0 }, 4), 0);
  assert.equal(encounterBudget(null, 4), 0);
  // A party of nobody is still a party of one, not a division by zero.
  assert.equal(encounterBudget({ xp: 100 }, 0), 100);
});

test('what is worth considering is neither scenery nor a funeral', () => {
  const pool = candidatesFor(BESTIARY, 1000).map((monster) => monster.name);

  // A rat is 10 XP: eight of them are still nothing against a thousand.
  assert.ok(!pool.includes('Rat'));
  // A dragon is sixty times the budget.
  assert.ok(!pool.includes('Ancient Red Dragon'));
  assert.ok(pool.includes('Ogre'));
  // Slightly over the budget is allowed — that is a hard fight, not a wrong
  // one — but nearly twice it is a different evening.
  assert.ok(pool.includes('Wight'), 'a tenth over the budget is still a fight');
  assert.ok(!pool.includes('Troll'), 'nearly twice the budget is not');
});

test('the budget is filled, and not by very much more than filled', () => {
  const rng = () => 0.5;
  for (const budget of [200, 900, 1800, 5000]) {
    const groups = fillBudget(BESTIARY, budget, rng);
    const total = groupsTotalXp(groups);
    assert.ok(groups.length >= 1, `something was chosen for ${budget}`);
    assert.ok(total >= budget * 0.6, `${total} is not far under ${budget}`);
    assert.ok(total <= budget * 1.3, `${total} is not far over ${budget}`);
    assert.ok(groups.every((group) => group.count <= 8), 'no unmanageable crowds');
    assert.ok(groups.length <= 2, 'two kinds at most');
  }
});

test('a budget nothing fits is answered with nothing', () => {
  assert.deepEqual(fillBudget(BESTIARY, 0), []);
  assert.deepEqual(fillBudget([], 500), []);
  assert.deepEqual(fillBudget(BESTIARY, 1), []);
});

// Being told what was spent is the difference between trusting the number and
// checking it.
test('the choice says what it came to', () => {
  const groups = [
    { monster: { name: 'Ogre' }, count: 2, xp: 900 },
    { monster: { name: 'Goblin' }, count: 1, xp: 50 },
  ];
  // Grouped the way the reader's own locale groups it.
  assert.equal(
    describeGroups(groups, 1000),
    `2 × Ogre and Goblin — ${(950).toLocaleString()} of ${(1000).toLocaleString()} XP`,
  );
  assert.match(describeGroups([], 1000), /nothing in the bestiary fits/);
});
