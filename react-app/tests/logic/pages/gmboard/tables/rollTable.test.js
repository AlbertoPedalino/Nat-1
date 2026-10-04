import test from 'node:test';
import assert from 'node:assert/strict';

const { ROLL_TABLES, rollTable, followUpTables, formatDice, describeRoll, summarizeStats } = await import('../../../../../src/pages/gmboard/tables/rollTable.js');
const { createDefaultTables } = await import('../../../../../src/pages/gmboard/tables/defaultTables.js');
const { gmBoardReducer, createInitialState, extractCoreState } = await import('../../../../../src/pages/gmboard/state/reducer.js');
const { ROLL_HISTORY_LIMIT } = await import('../../../../../src/pages/gmboard/state/constants.js');

function seqRng(values) {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error('rng sequence exhausted');
    const v = values[i];
    i += 1;
    return v;
  };
}

const tables = createDefaultTables();

test('the roller offers every generator table except weather', () => {
  assert.deepEqual(ROLL_TABLES.map((table) => table.id), ['event', 'encounter', 'loot', 'trap', 'compl', 'env']);
  assert.deepEqual(ROLL_TABLES.filter((table) => table.tiered).map((table) => table.id), ['encounter', 'trap']);
});

test('rollTable rolls 2d20 on the Event Table and returns the matching row', () => {
  const roll = rollTable(tables, 'event', {}, seqRng([0.3, 0.55, 0.5, 0.5]));
  assert.deepEqual(roll.dice, [{ sides: 20, value: 7 }, { sides: 20, value: 12 }]);
  assert.equal(roll.sum, 19);
  assert.equal(roll.tier, null);
  assert.equal(roll.data.name, 'Tracks/Clues');
  assert.equal(formatDice(roll), 'd20(7)+d20(12)=19');
  assert.deepEqual(describeRoll(roll), {
    titleLabel: 'Event',
    title: 'Tracks/Clues',
    stats: [{ label: 'DC to interact', value: '12', note: 'DC roll: d8(5)+d12(7)=12', emphasis: true }],
  });
});

test('rollTable rolls 1d8+1d12 on the Loot Table', () => {
  const roll = rollTable(tables, 'loot', {}, seqRng([0.99, 0.7, 0, 0.99]));
  assert.deepEqual(roll.dice, [{ sides: 8, value: 8 }, { sides: 12, value: 9 }]);
  assert.equal(roll.sum, 17);
  assert.equal(formatDice(roll), 'd8(8)+d12(9)=17');
  const described = describeRoll(roll);
  assert.equal(described.titleLabel, 'Loot');
  assert.equal(described.title, 'Magic Item');
  assert.deepEqual(described.stats.slice(0, 3), [
    { label: 'Rarity', value: 'Uncommon' },
    { label: 'Quality', value: 'Masterwork' },
    { label: 'Value', value: '20×Lv' },
  ]);
  assert.equal(summarizeStats(described.stats), 'Rarity Uncommon · Quality Masterwork · Value 20×Lv · DC to find it 13');
  assert.deepEqual(roll.dc, {
    label: 'DC to find it',
    dice: [{ sides: 8, value: 1 }, { sides: 12, value: 12 }],
    sum: 13,
  });
  assert.equal(formatDice(roll.dc), 'd8(1)+d12(12)=13');
});

test('an empty loot result has no detail line', () => {
  const roll = rollTable(tables, 'loot', {}, seqRng([0.5, 0.5]));
  assert.equal(roll.sum, 12);
  assert.deepEqual(describeRoll(roll), { titleLabel: 'Loot', title: 'Nothing found', stats: [] });
  assert.equal(roll.dc, null);
});

test('an event rolls the DC its result asks for, and no other dice', () => {
  // The rng throws when a roll asks for more values than listed.
  const event = (values) => rollTable(tables, 'event', {}, seqRng(values)).dc;
  assert.equal(event([0.3, 0.55, 0.5, 0.5]).label, 'DC to interact'); // 19: Tracks/Clues
  assert.equal(event([0.3, 0.55, 0.5, 0.5]).sum, 12);
  assert.equal(event([0.2, 0.2, 0.5, 0.5]).label, 'DC to spot the camp'); // 10: Enemy Camp
  assert.equal(event([0.1, 0.1]), null); // 6: Encounter
  assert.equal(event([0.45, 0.45]), null); // 20: Loot, whose DC comes with the loot roll
  assert.equal(event([0.15, 0.15]), null); // 8: Env. Damage/Trap, whose DC is on the trap row
});

test('tables without a check roll no DC', () => {
  assert.equal(rollTable(tables, 'encounter', { tier: 1 }, seqRng([0.5, 0.5])).dc, null);
  assert.equal(rollTable(tables, 'trap', { tier: 1 }, seqRng([0.5, 0.5])).dc, null);
  assert.equal(rollTable(tables, 'compl', {}, seqRng([0, 0])).dc, null);
  assert.equal(rollTable(tables, 'env', {}, seqRng([0, 0])).dc, null);
});

test('Encounter and Trap read the table of the requested tier', () => {
  const t1 = rollTable(tables, 'encounter', { tier: 1 }, seqRng([0.99, 0.99]));
  assert.equal(t1.sum, 40);
  assert.equal(t1.tier, 1);
  assert.deepEqual(describeRoll(t1), {
    titleLabel: 'Difficulty',
    title: 'High',
    stats: [{ label: 'Level', value: '4' }, { label: 'XP / PC', value: '500', emphasis: true }],
  });

  const t2 = rollTable(tables, 'encounter', { tier: 2 }, seqRng([0.99, 0.99]));
  assert.equal(t2.tier, 2);
  assert.equal(t2.data.lv, '10');
  assert.equal(t2.data.xp, 3100);

  const trap = rollTable(tables, 'trap', { tier: 2 }, seqRng([0, 0]));
  assert.equal(trap.sum, 2);
  assert.equal(trap.tier, 2);
  // A trap's one DC is named for both checks it covers.
  assert.deepEqual(describeRoll(trap), {
    titleLabel: 'Trap',
    title: 'Deadly',
    stats: [
      { label: 'Level', value: '10' },
      { label: 'DC', value: '17', note: 'detect & disarm', emphasis: true },
      { label: 'Damage', value: '22 (4d10)', emphasis: true },
    ],
  });
  assert.equal(summarizeStats(describeRoll(trap).stats), 'Level 10 · DC 17 · Damage 22 (4d10)');
});

test('Complication and Environment rolls describe their row', () => {
  const compl = rollTable(tables, 'compl', {}, seqRng([0.5, 0.5]));
  assert.deepEqual(describeRoll(compl), { titleLabel: 'Complication', title: 'None', stats: [] });

  const env = rollTable(tables, 'env', {}, seqRng([0, 0]));
  assert.deepEqual(describeRoll(env), { titleLabel: 'Severity', title: 'Legendary', stats: [] });
});

test('rollTable uses edited tables and ignores unknown table ids', () => {
  const edited = createDefaultTables();
  edited.events = edited.events.map((row) => (row.r === 19 ? { ...row, name: 'Dragon Sighting' } : row));
  assert.equal(rollTable(edited, 'event', {}, seqRng([0.3, 0.55, 0.5, 0.5])).data.name, 'Dragon Sighting');
  assert.equal(rollTable(tables, 'weather', {}, seqRng([])), null);
});

test('followUpTables names the tables a generator would roll next', () => {
  const event = (d1, d2) => followUpTables(rollTable(tables, 'event', {}, seqRng([d1, d2, 0.5, 0.5])));
  assert.deepEqual(event(0.1, 0.1), ['encounter']); // 6: Encounter
  assert.deepEqual(event(0.45, 0.45), ['loot']); // 20: Loot
  assert.deepEqual(event(0.2, 0.2), ['encounter', 'loot']); // 10: Enemy Camp
  assert.deepEqual(event(0.15, 0.15), ['trap']); // 8: Env. Damage/Trap
  assert.deepEqual(event(0.3, 0.55), []); // 19: Tracks/Clues

  const compl = (d8, d12) => followUpTables(rollTable(tables, 'compl', {}, seqRng([d8, d12])));
  assert.deepEqual(compl(0, 0), ['encounter']); // 2: Encounter
  assert.deepEqual(compl(0, 0.1), ['trap']); // 3: Environment Damage
  assert.deepEqual(compl(0, 0.2), ['env']); // 4: Environment
  assert.deepEqual(compl(0.5, 0.5), []); // 12: None

  assert.deepEqual(followUpTables(rollTable(tables, 'loot', {}, seqRng([0.99, 0.7, 0.5, 0.5]))), []);
});

test('followUpTables ignores an edited complication type that is not a known keyword', () => {
  assert.deepEqual(followUpTables({ tableId: 'compl', data: { type: 'constructor' } }), []);
});

test('roll history is newest first, capped, and cleared on demand', () => {
  let state = createInitialState();
  for (let i = 1; i <= ROLL_HISTORY_LIMIT + 3; i += 1) {
    state = gmBoardReducer(state, { type: 'addRoll', roll: { id: `roll_${i}`, tableId: 'event' } });
  }
  assert.equal(state.rolls.length, ROLL_HISTORY_LIMIT);
  assert.equal(state.rolls[0].id, `roll_${ROLL_HISTORY_LIMIT + 3}`);
  assert.equal(state.rolls.at(-1).id, 'roll_4');

  state = gmBoardReducer(state, { type: 'clearRolls' });
  assert.deepEqual(state.rolls, []);
});

test('roll tier and history stay out of the saved core state and survive hydration', () => {
  let state = gmBoardReducer(createInitialState(), { type: 'setRollTier', tier: 3 });
  state = gmBoardReducer(state, { type: 'addRoll', roll: { id: 'roll_1', tableId: 'loot' } });

  const core = extractCoreState(state);
  assert.equal('rolls' in core, false);
  assert.equal('rollTier' in core, false);

  const hydrated = gmBoardReducer(state, {
    type: 'hydrate',
    payload: { state: core, tables: state.tables, results: state.results },
  });
  assert.equal(hydrated.rollTier, 3);
  assert.equal(hydrated.rolls.length, 1);
});
