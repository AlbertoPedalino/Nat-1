import { clampCharacterVitals, maxHpFor } from './vitals.js';
import { clickedDeathSaveCount, markDead, toggleMortalCondition, withDeathSave } from './mortality.js';
import {
  DEAD_CONDITION_KEY as DEAD, EXHAUSTION_KEY as EXHAUSTION, EXHAUSTION_MAX, setConditionActive,
} from './conditions.js';
import { addReminder, effectId, normalizeEffects, removeEffect } from './combatEffects.js';

// Apply an intent to the vitals a command starts from — the character digest
// the caller follows (or, rarely, the sheet) — never to an encounter snapshot.
// The result is committed only if that digest is still current. The sheet
// applies the same function to its own state, so what it shows at once is what
// the digest then confirms.
//
// Dead, revived and the death-save count go through mortality.js, the rule the
// encounter builder and the map follow for every creature.
export function applyVitalCommand(data, command, baseMaxHP) {
  const maxFor = (bonus) => maxHpFor(baseMaxHP, bonus);
  const maxHP = maxFor(Number(data.maxHPBonus) || 0);
  let v = clampCharacterVitals(data, { maxHP, fallback: { currentHP: maxHP } });
  const n = Math.trunc(Number(command.value ?? command.delta) || 0);
  let recover = false;
  switch (command.type) {
    case 'modifyHp': {
      const absorbed = command.delta < 0 ? Math.min(v.tempHP, -n) : 0;
      v.tempHP -= absorbed;
      v.currentHP += n + absorbed;
      recover = true;
      break;
    }
    case 'setHp': v.currentHP = n; recover = true; break;
    case 'modifyTempHp': v.tempHP += n; break;
    case 'setTempHp': v.tempHP = n; break;
    case 'grantTempHp': v.tempHP = Math.max(v.tempHP, n); break;
    case 'modifyMaxHp': v.maxHPBonus += n; break;
    case 'setMaxHp': v.maxHPBonus = n - baseMaxHP; break;
    case 'setMaxHpBonus': v.maxHPBonus = n; break;
    case 'longRest':
      v.currentHP = maxHP;
      v.tempHP = 0;
      if ((command.exhaustionLevel ?? Math.max(0, (Number(data.exhaustionLevel) || 0) - 1)) === 0) v.activeConditions = v.activeConditions.filter((key) => key !== EXHAUSTION);
      recover = true;
      break;
    case 'setDeathSave': {
      const key = command.saveType;
      if (!['success', 'fail'].includes(key)) throw new Error('Invalid death save.');
      const count = command.toggle ? clickedDeathSaveCount(v.deathSaves[key], n) : n;
      v = withMortality(v, withDeathSave(mortalityOf(v), key, count));
      break;
    }
    case 'deathSaveRoll':
      if (v.currentHP > 0 || v.deathSaves.success >= 3 || v.deathSaves.fail >= 3) break;
      if (command.roll === 20) { v.currentHP = 1; recover = true; }
      else if (command.roll === 1) v.deathSaves.fail += 2;
      else v.deathSaves[command.total >= 10 ? 'success' : 'fail'] += 1;
      if (v.deathSaves.fail >= 3) v = withMortality(v, markDead(mortalityOf(v)));
      break;
    case 'toggleCombatantCondition':
      v = withMortality(v, toggleMortalCondition(mortalityOf(v), command.key));
      break;
    case 'clearCombatantConditions':
      if (v.activeConditions.includes(DEAD)) { v.currentHP = 1; recover = true; }
      v.activeConditions = command.clearExhaustion ? [] : v.activeConditions.filter((k) => k === EXHAUSTION);
      break;
    // Reminders: the encounter builder's own action names, so its dispatch
    // forwards them unchanged. Set by hand, never expired.
    case 'addCombatantEffect': v.activeEffects = addReminder(v.activeEffects, command.payload?.text); break;
    case 'removeCombatantEffect': v.activeEffects = removeEffect(v.activeEffects, command.effectId); break;
    case 'clearCombatantEffects': v.activeEffects = []; break;
    case 'patch':
      v = { ...v, ...command.patch };
      recover = Object.hasOwn(command.patch, 'currentHP');
      break;
    case 'setExhaustion':
      v.activeConditions = setConditionActive(v.activeConditions, EXHAUSTION, n > 0);
      if (n >= EXHAUSTION_MAX) v = withMortality(v, markDead(mortalityOf(v)));
      break;
    case 'editToken':
      if (Object.hasOwn(command.patch, 'currentHP')) { v.currentHP = command.patch.currentHP; recover = true; }
      for (const key of command.removeConditions || []) v.activeConditions = setConditionActive(v.activeConditions, key, false);
      for (const key of command.addConditions || []) v.activeConditions = setConditionActive(v.activeConditions, key, true);
      if (command.removeEffects?.length) {
        const gone = new Set(command.removeEffects);
        v.activeEffects = v.activeEffects.filter((effect) => !gone.has(effectId(effect)));
      }
      if (command.addEffects?.length) v.activeEffects = normalizeEffects([...v.activeEffects, ...command.addEffects]);
      v.deathSaves = { ...v.deathSaves, ...command.deathSaves };
      if (command.removeConditions?.includes(DEAD) && !command.deathSaves) {
        if (!Object.hasOwn(command.patch, 'currentHP')) v.currentHP = Math.max(1, v.currentHP);
        v.deathSaves = { success: 0, fail: 0 };
        recover = true;
      }
      if (command.addConditions?.includes(DEAD) || Number(command.deathSaves?.fail) >= 3) {
        v = withMortality(v, markDead(mortalityOf(v)));
      }
      break;
    default: throw new Error('Unknown character health command.');
  }
  v = clampCharacterVitals(v, { maxHP: maxFor(v.maxHPBonus) });
  if (recover && v.currentHP > 0) {
    v.deathSaves = { success: 0, fail: 0 };
    v.activeConditions = setConditionActive(v.activeConditions, DEAD, false);
  }
  return v;
}

// A character's vitals in mortality.js's shape, and its answer written back.
function mortalityOf(v) {
  return { player: true, hp: v.currentHP, deathSaves: v.deathSaves, conditions: v.activeConditions };
}

function withMortality(v, { hp, deathSaves, conditions }) {
  return { ...v, currentHP: hp, deathSaves, activeConditions: conditions };
}
