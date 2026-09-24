import { clampCharacterVitals } from './vitals.js';
import { setConditionActive, toggleCondition } from './conditions.js';

// Apply an intent to the vitals a command starts from — the character digest
// the caller follows (or, rarely, the sheet) — never to an encounter snapshot.
// The result is committed only if that digest is still current.
export function applyVitalCommand(data, command, baseMaxHP) {
  const maxFor = (bonus) => Math.max(1, baseMaxHP + bonus);
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
      if ((command.exhaustionLevel ?? Math.max(0, (Number(data.exhaustionLevel) || 0) - 1)) === 0) v.activeConditions = v.activeConditions.filter((key) => key !== 'exhaustion');
      recover = true;
      break;
    case 'setDeathSave': {
      const key = command.saveType === 's' ? 'success' : command.saveType === 'f' ? 'fail' : command.saveType;
      if (!['success', 'fail'].includes(key)) throw new Error('Invalid death save.');
      v.deathSaves[key] = command.toggle && v.deathSaves[key] === n ? n - 1 : n;
      v.activeConditions = setConditionActive(v.activeConditions, 'dead', v.deathSaves.fail >= 3);
      if (v.deathSaves.fail >= 3) v.currentHP = 0;
      break;
    }
    case 'deathSaveRoll':
      if (v.currentHP > 0 || v.deathSaves.success >= 3 || v.deathSaves.fail >= 3) break;
      if (command.roll === 20) { v.currentHP = 1; recover = true; }
      else if (command.roll === 1) v.deathSaves.fail += 2;
      else v.deathSaves[command.total >= 10 ? 'success' : 'fail'] += 1;
      if (v.deathSaves.fail >= 3) v.activeConditions = setConditionActive(v.activeConditions, 'dead', true);
      break;
    case 'toggleCombatantCondition':
      if (command.key === 'dead') {
        const dead = !v.activeConditions.includes('dead');
        v.currentHP = dead ? 0 : 1;
        v.deathSaves = { success: 0, fail: dead ? 3 : 0 };
        v.activeConditions = setConditionActive(v.activeConditions, 'dead', dead);
      } else v.activeConditions = toggleCondition(v.activeConditions, command.key);
      break;
    case 'clearCombatantConditions':
      if (v.activeConditions.includes('dead')) { v.currentHP = 1; recover = true; }
      v.activeConditions = command.clearExhaustion ? [] : v.activeConditions.filter((k) => k === 'exhaustion');
      break;
    case 'patch':
      v = { ...v, ...command.patch };
      recover = Object.hasOwn(command.patch, 'currentHP');
      break;
    case 'setExhaustion':
      v.activeConditions = setConditionActive(v.activeConditions, 'exhaustion', n > 0);
      if (n >= 6) {
        v.currentHP = 0;
        v.deathSaves.fail = 3;
        v.activeConditions = setConditionActive(v.activeConditions, 'dead', true);
      }
      break;
    case 'editToken':
      if (Object.hasOwn(command.patch, 'currentHP')) { v.currentHP = command.patch.currentHP; recover = true; }
      for (const key of command.removeConditions || []) v.activeConditions = setConditionActive(v.activeConditions, key, false);
      for (const key of command.addConditions || []) v.activeConditions = setConditionActive(v.activeConditions, key, true);
      v.deathSaves = { ...v.deathSaves, ...command.deathSaves };
      if (command.removeConditions?.includes('dead') && !command.deathSaves) {
        if (!Object.hasOwn(command.patch, 'currentHP')) v.currentHP = Math.max(1, v.currentHP);
        v.deathSaves = { success: 0, fail: 0 };
        recover = true;
      }
      if (command.addConditions?.includes('dead') || Number(command.deathSaves?.fail) >= 3) {
        v.currentHP = 0;
        v.deathSaves.fail = 3;
        v.activeConditions = setConditionActive(v.activeConditions, 'dead', true);
      }
      break;
    default: throw new Error('Unknown character health command.');
  }
  v = clampCharacterVitals(v, { maxHP: maxFor(v.maxHPBonus) });
  if (recover && v.currentHP > 0) {
    v.deathSaves = { success: 0, fail: 0 };
    v.activeConditions = setConditionActive(v.activeConditions, 'dead', false);
  }
  return v;
}
