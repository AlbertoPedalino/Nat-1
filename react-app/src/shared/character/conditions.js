// Conditions (XPHB 2024): the table, its mechanical effects, and the resolvers
// that turn a character's active conditions into roll decisions. Deliberately
// dependency-free — it must not reach the Vite-only adapter glob that
// calculations.js pulls in, or no test runner could import it.
//
// Shared rather than sheet-local: the encounter builder assigns the same
// conditions to combatants, and the two surfaces must agree on the table and on
// which conditions imply which.

export const CONDITIONS = [
  { key: 'blinded', label: 'Blinded', icon: 'EyeOff' }, { key: 'charmed', label: 'Charmed', icon: 'Heart' },
  { key: 'deafened', label: 'Deafened', icon: 'Ear' }, { key: 'frightened', label: 'Frightened', icon: 'Ghost' },
  { key: 'grappled', label: 'Grappled', icon: 'Hand' }, { key: 'incapacitated', label: 'Incapacitated', icon: 'Pause' },
  { key: 'invisible', label: 'Invisible', icon: 'CircleDashed' }, { key: 'paralyzed', label: 'Paralyzed', icon: 'Brain' },
  { key: 'petrified', label: 'Petrified', icon: 'Mountain' }, { key: 'poisoned', label: 'Poisoned', icon: 'FlaskConical' },
  { key: 'prone', label: 'Prone', icon: 'ArrowDown' }, { key: 'restrained', label: 'Restrained', icon: 'Link' },
  { key: 'stunned', label: 'Stunned', icon: 'Zap' }, { key: 'unconscious', label: 'Unconscious', icon: 'Moon' },
  { key: 'exhaustion', label: 'Exhaustion', icon: 'BatteryLow' },
];

// Conditions that inherently impose other conditions (XPHB 2024). Applying the
// parent auto-applies these so the sheet reflects the full rules effect. Removal
// is not cascaded (the implied condition may also stand on its own).
export const CONDITION_IMPLIES = {
  paralyzed: ['incapacitated'],
  petrified: ['incapacitated'],
  stunned: ['incapacitated'],
  unconscious: ['incapacitated', 'prone'],
};

// Machine-actionable mechanical effects per condition (XPHB 2024). One row per
// condition; each flag is read by a UI panel. Flag VALUE encodes conditionality:
//   true     → always applies while the condition is active (auto-applied to the
//              roll: drives advantage/disadvantage automatically).
//   <string> → conditional; applies only in the situation the string describes
//              (e.g. "while the source of fear is in sight"). Surfaced as a
//              situational reminder, never forced onto the roll — matches the
//              fixed/conditional split already used for saving throws.
// Flag vocabulary:
//   speedZero               Speed is 0.
//   yourAttacksDisadv       Disadvantage on your attack rolls.
//   yourAttacksAdv          Advantage on your attack rolls.
//   attacksAgainstHaveAdv   Attack rolls against you have advantage.
//   attacksAgainstHaveDisadv Attack rolls against you have disadvantage.
//   abilityChecksDisadv     Disadvantage on ability checks (and thus skills).
//   dexSaveDisadv           Disadvantage on DEX saving throws.
//   autoFailStrDexSave      Auto-fail STR and DEX saving throws.
//   autoFailSight           Auto-fail checks requiring sight.
//   autoFailHearing         Auto-fail checks requiring hearing.
//   noActions/noReactions/noConcentration  Can't act / react / concentrate.
//   meleeAgainstAdv         Melee attacks against you have advantage.
//   rangedAgainstDisadv     Ranged attacks against you have disadvantage.
//   critIfWithin5ft         A hit from within 5 ft is a critical hit.
//   resistAllDmg            Resistance to all damage.
// NOTE: consumed today — speedZero (Movement), attack/check disadvantage
// (ActionsTab, AbilityScores/Skills), DEX-save + auto-fail (SavingThrows),
// resistAllDmg (RightTop Defenses). The rest (attacksAgainstHaveAdv, crit,
// sense/hearing auto-fail, action economy) are accurate reference data — wire a
// consumer before relying on them.
// Exhaustion is graded/numeric (−2 per level to d20 tests, −5 ft Speed) and is
// modelled elsewhere (calculations.js), not here.
const IN_SIGHT = 'while the source of fear is in sight';
export const CONDITION_EFFECTS = {
  blinded:       { yourAttacksDisadv: true, attacksAgainstHaveAdv: true, autoFailSight: true },
  charmed:       {}, // social-only; no d20 flag
  deafened:      { autoFailHearing: true },
  frightened:    { yourAttacksDisadv: IN_SIGHT, abilityChecksDisadv: IN_SIGHT },
  grappled:      { speedZero: true, yourAttacksDisadv: 'vs targets other than the grappler' },
  incapacitated: { noActions: true, noReactions: true, noConcentration: true },
  invisible:     { yourAttacksAdv: true, attacksAgainstHaveDisadv: true },
  paralyzed:     { speedZero: true, autoFailStrDexSave: true, attacksAgainstHaveAdv: true, critIfWithin5ft: true },
  petrified:     { speedZero: true, autoFailStrDexSave: true, attacksAgainstHaveAdv: true, resistAllDmg: true },
  poisoned:      { yourAttacksDisadv: true, abilityChecksDisadv: true },
  prone:         { yourAttacksDisadv: true, meleeAgainstAdv: true, rangedAgainstDisadv: true }, // movement = crawl, not Speed 0
  restrained:    { speedZero: true, yourAttacksDisadv: true, attacksAgainstHaveAdv: true, dexSaveDisadv: true },
  stunned:       { speedZero: true, autoFailStrDexSave: true, attacksAgainstHaveAdv: true },
  unconscious:   { speedZero: true, autoFailStrDexSave: true, attacksAgainstHaveAdv: true, critIfWithin5ft: true },
};

const CONDITION_LABELS = Object.fromEntries(CONDITIONS.map((c) => [c.key, c.label]));

export const CONDITION_KEYS = CONDITIONS.map((c) => c.key);

// Exhaustion is graded 0–6 and that level lives outside the condition list
// (`exhaustionLevel`), so a surface that does not own the level must not offer
// it as a toggle: switching it off there would leave a level with no condition.
export const EXHAUSTION_KEY = 'exhaustion';
export const ASSIGNABLE_CONDITIONS = CONDITIONS.filter((c) => c.key !== EXHAUSTION_KEY);

export function conditionLabel(key) {
  return CONDITION_LABELS[key] || key;
}

// Drop unknown keys and duplicates, and order deterministically. Anything
// crossing the wire between a sheet and a combat goes through here, so an
// echo-suppression key built from it stays stable regardless of click order.
export function normalizeConditions(value) {
  if (!Array.isArray(value)) return [];
  const known = new Set(CONDITION_KEYS);
  return [...new Set(value.filter((key) => known.has(key)))].sort();
}

// Add or remove one condition. Adding also applies the conditions this one
// inherently imposes (Unconscious grants Incapacitated + Prone). Removal is
// deliberately not cascaded — an implied condition can also stand on its own,
// and guessing which to drop would silently undo the GM's other calls.
export function toggleCondition(activeConditions, key) {
  const list = Array.isArray(activeConditions) ? activeConditions : [];
  if (list.includes(key)) return list.filter((active) => active !== key);
  const next = [...list, key];
  (CONDITION_IMPLIES[key] || []).forEach((implied) => {
    if (!next.includes(implied)) next.push(implied);
  });
  return next;
}

// Active conditions that ALWAYS impose `flag` (value === true), as labels.
// Conditional (string-valued) effects are excluded — fetch those separately.
export function getConditionsWithEffect(activeConditions = [], flag) {
  return activeConditions
    .filter((key) => CONDITION_EFFECTS[key]?.[flag] === true)
    .map((key) => CONDITION_LABELS[key] || key);
}

// True if any active condition ALWAYS imposes `flag` (drives the auto-roll).
export function hasConditionEffect(activeConditions = [], flag) {
  return activeConditions.some((key) => CONDITION_EFFECTS[key]?.[flag] === true);
}

// Active conditions where `flag` is CONDITIONAL (value is a qualifier string):
// [{ source, note }]. These are reminders only — never forced onto the roll.
export function getConditionalConditionEffects(activeConditions = [], flag) {
  return activeConditions
    .filter((key) => typeof CONDITION_EFFECTS[key]?.[flag] === 'string')
    .map((key) => ({ source: CONDITION_LABELS[key] || key, note: CONDITION_EFFECTS[key][flag] }));
}

// Active conditions (labels) that zero Speed.
export function getSpeedZeroConditions(activeConditions = []) {
  return getConditionsWithEffect(activeConditions, 'speedZero');
}

// Disadvantage on ability checks (covers skills — skills are ability checks),
// combined with an external armor disadvantage. Shared by AbilityScores + Skills.
//   has    → an unconditional disadvantage applies (drives the roll + solid icon).
//   reason → its sources (armor + always-on conditions), comma-joined.
//   conditional → situational disadvantages [{source, note}] (reminder only).
export function describeCheckDisadvantage(activeConditions = [], armorDisadv = false) {
  const condSources = getConditionsWithEffect(activeConditions, 'abilityChecksDisadv');
  return {
    has: !!armorDisadv || condSources.length > 0,
    reason: [armorDisadv ? 'armor' : null, ...condSources].filter(Boolean).join(', '),
    conditional: getConditionalConditionEffects(activeConditions, 'abilityChecksDisadv'),
  };
}

// Resolves an attack roll's advantage state once, so every attack surface
// (weapon in ActionsTab, spell in SpellEntry, …) rolls the same way and shows
// the same tag/tint. XPHB 2024: any advantage + any disadvantage cancel to a
// straight roll.
//   extraAdv    → non-condition advantage source label (e.g. 'Innate Sorcery').
//   extraDisadv → non-condition disadvantage (heavy/untrained weapon).
// Returns the roll input (advArg, as rollD20 expects) alongside its display
// (tag, tooltip) and `disadv` for tinting, so those can never disagree.
export function describeAttackRoll(activeConditions = [], { extraAdv = null, extraDisadv = false } = {}) {
  const hasAdv = !!extraAdv || hasConditionEffect(activeConditions, 'yourAttacksAdv');
  const hasDisadv = !!extraDisadv || hasConditionEffect(activeConditions, 'yourAttacksDisadv');
  const adv = hasAdv && !hasDisadv;
  const disadv = hasDisadv && !hasAdv;
  // Situational disadvantage (Frightened in sight, Grappled vs non-grappler):
  // a reminder only — never forced onto the roll.
  const condNotes = getConditionalConditionEffects(activeConditions, 'yourAttacksDisadv')
    .map((c) => `${c.source} (${c.note})`);
  const situational = !adv && !disadv && condNotes.length > 0;
  return {
    adv,
    disadv,
    advArg: disadv ? false : adv ? true : undefined,
    tag: disadv ? ' DIS' : adv ? ' ADV' : situational ? ' DIS?' : '',
    tooltip: [
      adv && typeof extraAdv === 'string' ? `Advantage: ${extraAdv}` : '',
      condNotes.length ? `Situational disadvantage: ${condNotes.join('; ')}` : '',
    ].filter(Boolean).join(' • '),
  };
}
