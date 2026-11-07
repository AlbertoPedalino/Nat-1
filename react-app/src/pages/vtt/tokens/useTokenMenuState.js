import { useCallback, useEffect, useRef, useState } from 'react';
import { addReminder, removeEffect } from '../../../shared/character/combat/combatEffects.js';
import { normalizeDeathSaves } from '../../../shared/character/combat/vitals.js';
import { applyMonsterVitalCommand } from '../../../shared/vtt/tokens/fightVitals.js';
import { DEAD_CONDITION_KEY, toggleCondition } from '../../../shared/character/combat/conditions.js';
import {
  clickedDeathSaveCount, markDead, resolveMortality, revive, withDeathSave,
} from '../../../shared/character/combat/mortality.js';

// Long enough that a word is not written mid-keystroke, short enough that
// closing the menu straight after typing still catches it.
const TYPING_DELAY = 400;

// What the one "+ 5 -" stepper does to the field it targets.
export const STEP_TARGETS = {
  hp: { command: 'modifyHp', plusLabel: 'Heal', minusLabel: 'Damage' },
  max: { command: 'modifyMaxHp', plusLabel: 'Increase max HP', minusLabel: 'Decrease max HP' },
  temp: { command: 'modifyTempHp', plusLabel: 'Add temp HP', minusLabel: 'Remove temp HP' },
};

function deathSavesForToken(value, conditions, characterId) {
  const normalized = normalizeDeathSaves(value);
  return characterId && (conditions || []).includes(DEAD_CONDITION_KEY)
    ? { ...normalized, fail: 3 }
    : normalized;
}

// The piece menu's fields and how each one writes: loaded once per opening,
// conditions/reminders/hit points following the live piece, typing debounced
// into token saves (`onSave`) and maximum/temporary hit points into health
// commands (`onVitals`).
export function useTokenMenuState(token, { onSave, onVitals }) {
  const [label, setLabel] = useState('');
  const [gmOnly, setGmOnly] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [hpCurrent, setHpCurrent] = useState('');
  const [hpMax, setHpMax] = useState('');
  const [tempHp, setTempHp] = useState('');
  // How far the maximum stands above (or below) the base one: a character's
  // sheet, an encounter creature's, or a loose piece's maximum last typed.
  const [maxBonus, setMaxBonus] = useState(0);
  // One "+ 5 -" for the three fields: it acts on the one the cursor was last
  // in, HP until another is picked. The amount stays between pieces.
  const [stepTarget, setStepTarget] = useState('hp');
  const [stepAmount, setStepAmount] = useState('5');
  const [showHp, setShowHp] = useState(false);
  const [effects, setEffects] = useState([]);
  const [deathSaves, setDeathSaves] = useState({ success: 0, fail: 0 });
  const syncedIdRef = useRef(null);
  const typingTimerRef = useRef(null);
  const pendingPatchRef = useRef({});
  const vitalsTimerRef = useRef(null);
  const pendingVitalsRef = useRef({});

  // Loaded once per opening, keyed by id rather than by object identity: a
  // realtime update rebuilds the token on every render, and resyncing on that
  // would wipe whatever is half-typed in the fields. The menu stays mounted
  // while closed, so closing forgets the piece: reopening the same one must
  // read it again, or its next edit writes back what this screen saw last time.
  useEffect(() => {
    if (!token) {
      syncedIdRef.current = null;
      return;
    }
    if (syncedIdRef.current === token.id) return;
    syncedIdRef.current = token.id;
    pendingPatchRef.current = {};
    clearTimeout(typingTimerRef.current);
    pendingVitalsRef.current = {};
    clearTimeout(vitalsTimerRef.current);
    setStepTarget('hp');
    const secret = token.secretLabel || '';
    setGmOnly(Boolean(secret));
    setLabel(secret || token.label || '');
    setConditions(token.conditions || []);
    setHpCurrent(token.hpCurrent ?? '');
    setHpMax(token.hpMax ?? '');
    setTempHp(token.tempHp ?? 0);
    setMaxBonus(token.maxHpBonus || 0);
    setShowHp(Boolean(token.showHp));
    setEffects(token.effects || []);
    setDeathSaves(deathSavesForToken(token.deathSaves, token.conditions, token.characterId));
  }, [token]);

  // Conditions and reminders are toggled, never typed, so an open menu follows
  // them live. Every save sends the whole list: a stale one would undo what
  // another screen set meanwhile.
  const liveConditions = JSON.stringify(token?.conditions || []);
  const liveEffects = JSON.stringify(token?.effects || []);
  useEffect(() => {
    if (!token || syncedIdRef.current !== token.id) return;
    setConditions(token.conditions || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveConditions]);
  useEffect(() => {
    if (!token || syncedIdRef.current !== token.id) return;
    setEffects(token.effects || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveEffects]);

  // Hit points change under an open menu too (a step from here coming back,
  // another screen). A field with a typed value still waiting keeps it.
  const liveVitals = [token?.hpCurrent, token?.hpMax, token?.tempHp, token?.maxHpBonus].join('|');
  useEffect(() => {
    if (!token || syncedIdRef.current !== token.id) return;
    const pending = pendingVitalsRef.current;
    if (!Object.hasOwn(pendingPatchRef.current, 'hpCurrent')) setHpCurrent(token.hpCurrent ?? '');
    if (!Object.hasOwn(pendingPatchRef.current, 'hpMax') && !pending.setMaxHp) {
      setHpMax(token.hpMax ?? '');
      setMaxBonus(token.maxHpBonus || 0);
    }
    if (!pending.setTempHp) setTempHp(token.tempHp ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveVitals]);

  useEffect(() => () => {
    clearTimeout(typingTimerRef.current);
    clearTimeout(vitalsTimerRef.current);
  }, []);

  // Every control writes as it is used. A Save button in a menu opened by
  // right-clicking a piece mid-combat is one click too many, and forgetting it
  // loses the change silently.
  const save = useCallback((patch) => {
    if (!token) return;
    clearTimeout(typingTimerRef.current);
    patch = { ...pendingPatchRef.current, ...patch };
    pendingPatchRef.current = {};
    const next = {
      label, gmOnly, conditions, showHp, effects, hpCurrent, hpMax, deathSaves, ...patch,
    };
    onSave(token, {
      label: next.label,
      gmOnly: next.gmOnly,
      conditions: next.conditions,
      effects: next.effects,
      showHp: next.showHp,
      // Blank clears them rather than writing a zero, which would read as a
      // dead creature.
      hpCurrent: next.hpCurrent === '' ? null : Number(next.hpCurrent),
      hpMax: next.hpMax === '' ? null : Number(next.hpMax),
      deathSaves: deathSavesForToken(next.deathSaves, next.conditions, token.characterId),
      // Only fields touched by this control are a health edit. Renaming a
      // token or changing its visibility must never replay cached HP.
      healthPatch: {
        ...(Object.hasOwn(patch, 'hpCurrent') ? { currentHP: next.hpCurrent === '' ? 0 : Number(next.hpCurrent) } : {}),
        ...(Object.hasOwn(patch, 'conditions') ? { activeConditions: next.conditions } : {}),
        ...(Object.hasOwn(patch, 'effects') ? { activeEffects: next.effects } : {}),
        ...(Object.hasOwn(patch, 'deathSaves') ? { deathSaves: next.deathSaves } : {}),
      },
    });
  }, [conditions, deathSaves, effects, gmOnly, hpCurrent, hpMax, label, onSave, showHp, token]);

  // Typing is the one thing not written per keystroke: that would be a row
  // version per character, and a realtime event for each one.
  const saveSoon = useCallback((patch) => {
    clearTimeout(typingTimerRef.current);
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    typingTimerRef.current = setTimeout(() => save({}), TYPING_DELAY);
  }, [save]);

  // Maximum and temporary hit points typed in: one command per field once the
  // typing stops, the last value of each.
  const flushVitals = useCallback(() => {
    clearTimeout(vitalsTimerRef.current);
    const pending = Object.values(pendingVitalsRef.current);
    pendingVitalsRef.current = {};
    if (token && onVitals) pending.forEach((command) => onVitals(token, command));
  }, [onVitals, token]);

  const vitalsSoon = useCallback((command) => {
    clearTimeout(vitalsTimerRef.current);
    pendingVitalsRef.current = { ...pendingVitalsRef.current, [command.type]: command };
    vitalsTimerRef.current = setTimeout(flushVitals, TYPING_DELAY);
  }, [flushVitals]);

  // A stepper click on the targeted field, shown at once and corrected by the
  // values that come back. A value still being typed goes first.
  const step = useCallback((delta) => {
    if (!token || !onVitals) return;
    flushVitals();
    if (Object.keys(pendingPatchRef.current).length) save({});
    const command = { type: STEP_TARGETS[stepTarget].command, delta };
    // What the GM sees is what the step applies to: a value typed a moment ago
    // may not have come back on the piece yet.
    const shown = {
      hpCurrent: hpCurrent === '' ? null : Number(hpCurrent),
      hpMax: hpMax === '' ? null : Number(hpMax),
      tempHP: Number(tempHp) || 0,
      maxHPBonus: maxBonus,
      activeConditions: conditions,
    };
    const after = applyMonsterVitalCommand(shown, command);
    setHpCurrent(after.hpCurrent ?? '');
    setHpMax(after.hpMax ?? '');
    setTempHp(after.tempHP ?? 0);
    setMaxBonus(after.maxHPBonus || 0);
    // A character at 0 HP is dying, not dead: their sheet decides.
    if (!token.characterId && after.activeConditions) setConditions(after.activeConditions);
    onVitals(token, command, shown);
  }, [conditions, flushVitals, hpCurrent, hpMax, maxBonus, onVitals, save, stepTarget, tempHp, token]);

  // What each control does when used. Called only while a piece is open.

  const changeLabel = (value) => {
    setLabel(value);
    saveSoon({ label: value });
  };

  const changeGmOnly = (checked) => { setGmOnly(checked); save({ gmOnly: checked }); };

  const changeShowHp = (checked) => { setShowHp(checked); save({ showHp: checked }); };

  const changeHpCurrent = (value) => {
    setHpCurrent(value);
    // A character at 0 is dying rather than dead, and a blank
    // sheet value would read as 0.
    if (token.characterId) {
      if (value !== '') saveSoon({ hpCurrent: value });
      return;
    }
    if (value === '') {
      saveSoon({ hpCurrent: value });
      return;
    }
    const nextConditions = resolveMortality({ player: false, hp: Number(value), conditions }).conditions;
    setConditions(nextConditions);
    saveSoon({ hpCurrent: value, conditions: nextConditions });
  };

  const changeHpMax = (value) => {
    setHpMax(value);
    if (!onVitals) {
      saveSoon({ hpMax: value });
      return;
    }
    if (value !== '' && Number(value) >= 1) {
      vitalsSoon({ type: 'setMaxHp', value: Math.trunc(Number(value)) });
    }
  };

  const changeTempHp = (value) => {
    setTempHp(value);
    if (value !== '') vitalsSoon({ type: 'setTempHp', value: Math.max(0, Math.trunc(Number(value)) || 0) });
  };

  const markDeathSave = (type, value) => {
    const count = clickedDeathSaveCount(deathSaves[type], value);
    const {
      deathSaves: nextDeathSaves, conditions: nextConditions, dead,
    } = withDeathSave({ hp: hpCurrent, deathSaves, conditions }, type, count);
    setDeathSaves(nextDeathSaves);
    setConditions(nextConditions);
    save({
      deathSaves: nextDeathSaves,
      conditions: nextConditions,
      ...(dead ? { hpCurrent: 0 } : {}),
    });
  };

  const clickCondition = (key) => {
    const next = toggleCondition(conditions, key);
    setConditions(next);
    if (key !== DEAD_CONDITION_KEY) {
      save({ conditions: next });
      return;
    }
    const mortal = { player: Boolean(token.characterId), deathSaves, conditions: next };
    const { hp: nextHp, deathSaves: nextDeathSaves } = next.includes(DEAD_CONDITION_KEY)
      ? markDead(mortal)
      : revive(mortal);
    setHpCurrent(nextHp);
    setDeathSaves(nextDeathSaves);
    save({
      conditions: next,
      hpCurrent: nextHp,
      deathSaves: nextDeathSaves,
    });
  };

  const addReminderText = (text) => {
    const next = addReminder(effects, text);
    setEffects(next);
    save({ effects: next });
  };

  const removeReminder = (id) => {
    const next = removeEffect(effects, id);
    setEffects(next);
    save({ effects: next });
  };

  return {
    label, gmOnly, conditions, hpCurrent, hpMax, tempHp, maxBonus,
    stepTarget, setStepTarget, stepAmount, setStepAmount, showHp, effects, deathSaves,
    save, flushVitals, step,
    changeLabel, changeGmOnly, changeShowHp, changeHpCurrent, changeHpMax, changeTempHp,
    markDeathSave, clickCondition, addReminderText, removeReminder,
  };
}
