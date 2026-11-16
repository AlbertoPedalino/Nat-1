import { render } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Every theme value registered after the modules loaded: the ones a throw
// would register mid-flight are what warmRolls has to have done already.
const seen = vi.hoisted(() => ({ keys: [], on: false, known: new Set() }));
vi.mock('../../../../../src/shared/ui/themedValues.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    themedValue: (key, compute) => {
      if (seen.on && !seen.known.has(key)) seen.keys.push(key);
      seen.known.add(key);
      return real.themedValue(key, compute);
    },
  };
});

const { default: DiceTray } = await import('../../../../../src/pages/vtt/rolls/DiceTray.jsx');
const { default: DiceToast } = await import('../../../../../src/shared/character/dice/DiceToast.jsx');
const { warmRolls } = await import('../../../../../src/shared/character/dice/warmRolls.js');
const { resolveDice } = await import('../../../../../src/shared/ui/diceSets.js');
const { makeRollEntry, normalizeRoll, rollToast } = await import('../../../../../src/shared/vtt/rolls/rollFeed.js');
const { buildD20Meta, formatD20Detail, rollD20 } = await import('../../../../../src/shared/character/dice/dice.js');
const { customRollToast } = await import('../../../../../src/shared/character/dice/customRoll.js');

afterEach(() => vi.unstubAllGlobals());

function sharedRoll(toast) {
  return normalizeRoll(makeRollEntry(toast, { visibility: 'public' }));
}

// A natural 20 kept, a natural 1 dropped: both result colours, the mode chip
// and a moment's burst, besides the faces kept and dropped.
function advantageRoll() {
  const sequence = [0.99, 0];
  let next = 0;
  const result = rollD20(3, { advantage: true, rng: () => sequence[next++ % 2] });
  return sharedRoll({
    label: 'Strength Check',
    detail: formatD20Detail(result),
    total: result.total,
    rolls: result.rolls,
    meta: buildD20Meta(result, { kind: 'abilityCheck' }),
  });
}

test('a first throw after warmRolls registers no theme value of its own', () => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const rolls = [advantageRoll(), sharedRoll(customRollToast('1d4+1d6+1d8+1d10+1d12+1d2'))];

  seen.on = true;
  warmRolls(resolveDice(rolls[0].dice));
  const warmed = seen.keys.length;
  seen.keys = [];

  rolls.forEach((roll) => render(
    <>
      <DiceTray throws={[{ roll, x: 300, y: 200 }]} />
      <DiceToast toast={rollToast(roll)} onClose={() => {}} />
    </>,
  ));

  expect(seen.keys).toEqual([]);
  // Kept small: every value is a variable on :root, rewritten whenever one
  // more is registered.
  expect(warmed).toBeLessThan(80);
});
