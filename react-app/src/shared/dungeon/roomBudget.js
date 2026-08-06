// Turning a rolled encounter into creatures to put in the room.
//
// The dungeon engine answers in difficulty and experience — "Hard, level 5,
// 1,100 XP each" — which is a budget, not a monster. This picks the monsters.
//
// The rules it follows are the ones a GM uses without thinking about them: a
// handful of the same creature rather than one of everything, nothing so far
// below the party that it is scenery, and the total as near the budget as the
// bestiary allows. It is deliberately not clever — a search for the perfect
// combination would produce three quarters of a beholder.

const numberOr = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

// How far over the budget a group may go before it is worse than being under.
// Slightly over is a fight; twice over is a funeral.
const OVERSHOOT = 1.15;
// Nobody wants to run a dozen of anything on a battlemap.
const MAX_PER_KIND = 8;

// The budget for the whole party, from the engine's per-character number.
export function encounterBudget(encounter, partySize) {
  const each = numberOr(encounter?.xp);
  const size = Math.max(1, Math.round(numberOr(partySize, 4)));
  return Math.max(0, Math.round(each * size));
}

// The creatures worth considering for a budget: nothing whose entire kind is
// rounding error against it, nothing that would blow it on its own.
export function candidatesFor(monsters, budget) {
  return (monsters || [])
    .filter((monster) => numberOr(monster?.xp) > 0)
    .filter((monster) => monster.xp <= budget * OVERSHOOT)
    .filter((monster) => monster.xp * MAX_PER_KIND >= budget * 0.35);
}

// Fill the budget with one kind of creature, then top up with a second if a
// meaningful share of it is left. Two kinds is a fight with a shape — archers
// behind a brute — and three is bookkeeping.
export function fillBudget(monsters, budget, rng = Math.random) {
  if (!(budget > 0)) return [];
  const pool = candidatesFor(monsters, budget);
  if (!pool.length) return [];

  const pick = (list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  const groups = [];
  let left = budget;

  for (let round = 0; round < 2 && left > 0; round += 1) {
    const affordable = pool.filter((monster) => monster.xp <= left * OVERSHOOT);
    if (!affordable.length) break;
    const monster = pick(affordable);
    // As many as the budget takes, and never so many that the round is spent
    // rolling initiative.
    const count = Math.max(1, Math.min(MAX_PER_KIND, Math.round(left / monster.xp)));
    const spend = count * monster.xp;
    groups.push({ monster, count, xp: spend });
    left -= spend;
    // A remainder this small is not another monster, it is a rounding error.
    if (left < budget * 0.25) break;
  }

  return groups;
}

export function groupsTotalXp(groups) {
  return (groups || []).reduce((total, group) => total + numberOr(group.xp), 0);
}

// What the GM is told before anything is placed: the creatures, and how near
// the budget they came. Being told "1,100 of 1,200" is the difference between
// trusting the number and checking it.
export function describeGroups(groups, budget) {
  if (!groups?.length) return 'nothing in the bestiary fits that budget';
  const names = groups
    .map((group) => (group.count > 1 ? `${group.count} × ${group.monster.name}` : group.monster.name))
    .join(' and ');
  return `${names} — ${groupsTotalXp(groups).toLocaleString()} of ${Math.round(budget).toLocaleString()} XP`;
}
