import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Stack, Button, Typography } from '@mui/material';
import { Hourglass, Moon } from 'lucide-react';
import { SHEET_AREAS, SHEET_GRID, SHEET_GRID_ITEM_SX } from './layout.js';
import TopBar from './components/TopBar.jsx';
import AbilityScores from './components/AbilityScores.jsx';
import HPBlock from './components/HPBlock.jsx';
import SavingThrows from './components/SavingThrows.jsx';
import Senses from './components/Senses.jsx';
import Proficiencies from './components/Proficiencies.jsx';
import HitDiceSpendControl from './components/HitDiceSpendControl.jsx';
import SheetDialog from '../../shared/character/SheetDialog.jsx';
import Skills from './components/Skills.jsx';
import Movement from './components/Movement.jsx';
import RightTop from './components/RightTop.jsx';
import TabsPanel from './components/TabsPanel.jsx';
import DiceToast from './components/DiceToast.jsx';
import { deriveSheetState } from './state.js';
import { ProficiencySetsProvider } from './context/ProficiencySetsContext.jsx';
import { SheetActionsProvider } from './context/SheetActionsContext.jsx';
import { clearCraftedByFlag, VANISH_ON_LONG_REST_FLAGS } from '../../shared/character/craftedItems.js';
import { buildD20Meta, formatD20Detail, rollD20 as rollD20Dice } from '../../shared/character/dice.js';
import { aggregateSavingThrowBonus } from '../../shared/character/itemBonus.js';
import { itemEffectInventory } from '../../shared/character/wildShapeForm.js';
import { longRestCharacterPatch } from '../../shared/character/longRest.js';
import { calcMaxHP, getMod, getFinal, getSaveBonus, CONDITION_IMPLIES, clampExhaustion, exhaustionD20Penalty, EXHAUSTION_MAX } from './logic/calculations.js';
import { normalizeCharacterAttunement } from './logic/attunement.js';
import { applyResourceRest, getAllResourceDefs, getHitDicePools, getUsedHitDiceTotal, normalizeResourceMax, resourceFullValue } from './logic/restResources.js';
import { clearedToggles } from './logic/toggleState.js';
import { applyFreeCastRest, getFreeCastDefsForCharacter } from './logic/spellsTabLogic.js';
import { installedRegistry } from '../../adapters/index.js';
import { ensureSheetRuntimeAdapters } from './logic/sheetRuntimeAdapters.js';
import { loadItems, loadOptionalFeatures, loadConditions, reconcileInventoryWithItemsDb } from '../charbuilder/logic/dataLoaders.js';
import { updateCloudCharacterData } from '../../shared/cloud/cloudCharacters.js';
import { clampCharacterVitals } from '../../shared/character/vitals.js';
import {
  getActiveCharId,
  loadCharacter as storeLoadCharacter,
  patchCharacter as storePatchCharacter,
  setActiveCharId,
} from '../../shared/character/store.js';

function getCharIdFromUrl() {
  return new URLSearchParams(window.location.search).get('char') || getActiveCharId();
}

// A long rest reduces Exhaustion by 1 (XPHB 2024). Returns the patch fields that
// lower the level and drop the pill once it reaches 0. Shared by both rest paths.
function longRestExhaustionPatch(sheet) {
  const exhaustionLevel = clampExhaustion((sheet.exhaustionLevel || 0) - 1);
  const activeConditions = exhaustionLevel === 0
    ? (sheet.activeConditions || []).filter((k) => k !== 'exhaustion')
    : (sheet.activeConditions || []);
  return { exhaustionLevel, activeConditions };
}

const EMBEDDED_SHEET_GRID = {
  gridTemplateColumns: '1fr',
  gridTemplateAreas: `
    "${SHEET_AREAS.saves}"
    "${SHEET_AREAS.skills}"
    "${SHEET_AREAS.senses}"
    "${SHEET_AREAS.movement}"
    "${SHEET_AREAS.profs}"
    "${SHEET_AREAS.right}"
  `,
  gap: '0.55rem',
};

export default function CharacterSheet({ externalChar = null, externalCharId = null, readOnly = false, embedded = false, liveVitals = null } = {}) {
  const [C, setC] = useState(null);
  const [sheet, setSheet] = useState(null);
  const sheetRef = useRef(null);
  const [charId, setCharId] = useState(null);
  const [tab, setTab] = useState(0);
  const [diceToast, setDiceToast] = useState(null);
  const [rollLog, setRollLog] = useState([]);
  const [resources, setResources] = useState({});
  const [freeCastUses, setFreeCastUses] = useState({});
  const [shortRestOpen, setShortRestOpen] = useState(false);
  const [longRestOpen, setLongRestOpen] = useState(false);
  const [hdToSpend, setHdToSpend] = useState({});
  const [conditionEntries, setConditionEntries] = useState({});
  const cloudSaveReadyRef = useRef(false);
  const usesExternalChar = Boolean(externalChar);
  sheetRef.current = sheet;

  useEffect(() => {
    let alive = true;
    cloudSaveReadyRef.current = false;
    // Read-only view feeds the character directly (from the cloud); skip local
    // store entirely so nothing is written and auto-sync stays silent.
    const id = externalChar ? externalCharId : getCharIdFromUrl();
    const ch = externalChar || (id ? storeLoadCharacter(id) : null);
    if (!externalChar && id && ch) setActiveCharId(id);

    Promise.all([
      // A failed adapter chunk (e.g. a stale-deploy 404) must not blank the whole
      // sheet — fall back to base values and still render the character.
      ensureSheetRuntimeAdapters(ch),
      loadItems().catch(() => []),
      loadOptionalFeatures().catch(() => []),
      loadConditions().catch(() => ({})),
    ]).then(([, itemsDb, optFeatures, condEntries]) => {
      if (!alive) return;
      setConditionEntries(condEntries || {});

      // Re-merge structured effect fields from the items DB into the stored
      // inventory so sheet calculations and item effects read canonical item
      // records while preserving user-managed inventory state.
      let nextChar = ch;
      if (ch && Array.isArray(ch.inventory)) {
        const refreshed = reconcileInventoryWithItemsDb(ch.inventory, itemsDb);
        const reconciled = normalizeCharacterAttunement({ ...ch, inventory: refreshed }, refreshed);
        if (reconciled !== ch.inventory) {
          nextChar = { ...ch, inventory: reconciled };
          if (!externalChar && id) storePatchCharacter(id, { inventory: reconciled });
        }
      }

      if (optFeatures?.length) nextChar = { ...nextChar, optionalFeatureEntries: optFeatures };

      setCharId(id);
      setC(nextChar);
      if (nextChar) {
        setSheet(deriveSheetState(nextChar));
        const stored = nextChar.resources && typeof nextChar.resources === 'object' ? nextChar.resources : {};
        const allResDefs = getAllResourceDefs(nextChar);
        const merged = { ...stored };
        allResDefs.forEach((def) => {
          if (!def.key) return;
          const max = normalizeResourceMax(def, nextChar);
          // 'used'-tracked pools (e.g. Lay on Hands) start empty (0 spent);
          // 'remaining'-tracked resources start full (max).
          const initial = resourceFullValue(def, max);
          const cur = merged[def.key];
          // Initialize new pools; clamp existing value to the recomputed max
          // (e.g. after a level-up changed Proficiency Bonus).
          merged[def.key] = cur == null ? initial : Math.min(Math.max(0, Number(cur) || 0), max);
        });
        setResources(merged);
        if (!externalChar && id) storePatchCharacter(id, { resources: merged });
        setFreeCastUses(nextChar.freeCastUses && typeof nextChar.freeCastUses === 'object' ? nextChar.freeCastUses : {});
      }
    });

    return () => { alive = false; };
  }, [externalChar, externalCharId]);

  const persist = useCallback((patch) => {
    if (!charId || !patch) return;
    if (usesExternalChar) {
      setC((prev) => prev ? { ...prev, ...patch } : prev);
      return;
    }
    const next = storePatchCharacter(charId, patch);
    if (next) setC(next);
    else setC((prev) => prev ? { ...prev, ...patch } : prev);
  }, [charId, usesExternalChar]);

  const syncSheet = useCallback((updates) => {
    setSheet((prev) => ({ ...prev, ...updates }));
  }, []);

  // Vitals pushed live from the linked encounter combat (cloud Realtime). Merge
  // ONLY hp / temp hp / death saves so an editable sheet stays in sync without
  // discarding the user's in-progress edits to other fields. Runs only when a new
  // liveVitals object arrives (not on local sheet edits); last-writer-wins on
  // these three fields. The idempotent guard makes our own save echoes no-ops.
  useEffect(() => {
    if (!liveVitals || !usesExternalChar || readOnly) return;
    const s = sheetRef.current;
    if (!s) return;
    const vitals = clampCharacterVitals(liveVitals, { fallback: s });
    // Max HP is derived (base + bonus); apply the synced bonus and re-clamp current.
    const baseMax = Math.max(1, (Number(s.maxHP) || 1) - (Number(s.maxHPBonus) || 0));
    const maxHPBonus = vitals.maxHPBonus;
    const maxHP = Math.max(1, baseMax + maxHPBonus);
    const currentHP = Math.max(0, Math.min(maxHP, vitals.currentHP));
    const { tempHP, deathSaves } = vitals;
    if (
      currentHP === s.currentHP
      && tempHP === s.tempHP
      && maxHP === s.maxHP
      && maxHPBonus === (s.maxHPBonus || 0)
      && deathSaves.success === (s.deathSaves?.success || 0)
      && deathSaves.fail === (s.deathSaves?.fail || 0)
    ) return;
    setSheet((prev) => (prev ? { ...prev, currentHP, tempHP, maxHP, maxHPBonus, deathSaves } : prev));
    persist({ currentHP, tempHP, maxHPBonus, deathSaves });
  }, [liveVitals, usesExternalChar, readOnly, persist]);

  const updateCurrentCharacter = useCallback((updater) => {
    setC((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!usesExternalChar && charId) storePatchCharacter(charId, next);
      return next;
    });
  }, [charId, usesExternalChar]);

  const updateInventory = useCallback((inventory) => {
    const normalized = normalizeCharacterAttunement(C, inventory);
    setSheet((prev) => ({ ...prev, sheetInventory: normalized }));
    updateCurrentCharacter((prev) => ({ ...prev, inventory: normalized }));
  }, [C, updateCurrentCharacter]);

  const updateCurrency = useCallback((currency) => {
    setSheet((prev) => ({ ...prev, sheetCurrency: currency }));
    updateCurrentCharacter((prev) => ({ ...prev, currency }));
  }, [updateCurrentCharacter]);

  const updateSpells = useCallback((nextSpellData) => {
    updateCurrentCharacter((prev) => ({ ...prev, ...nextSpellData }));
  }, [updateCurrentCharacter]);

  const saveResourcesState = useCallback((next) => {
    setResources(next);
    persist({ resources: next });
  }, [persist]);

  const showDiceToast = useCallback((label, detail, total, rolls, meta) => {
    const entry = { label, detail, total, rolls, meta, timestamp: Date.now() };
    setDiceToast(entry);
    setRollLog((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  // Non-dice events (rests, death-save guards): no roll, no numeric total — just a
  // labelled message. Routes through the same toast so DiceToast renders the detail.
  const showNotice = useCallback((label, message) => {
    showDiceToast(label, message, null, []);
  }, [showDiceToast]);

  useEffect(() => {
    if (!usesExternalChar || readOnly || !charId || !C) return undefined;
    if (!cloudSaveReadyRef.current) {
      cloudSaveReadyRef.current = true;
      return undefined;
    }
    const handle = setTimeout(() => {
      updateCloudCharacterData(charId, C).catch((error) => {
        showNotice('Cloud Save', error?.message || 'Failed to save online sheet.');
      });
    }, 1200);
    return () => clearTimeout(handle);
  }, [usesExternalChar, readOnly, charId, C, showNotice]);

  const openShortRest = useCallback(() => {
    setHdToSpend({});
    setShortRestOpen(true);
  }, []);

  const confirmShortRest = useCallback(() => {
    const s = { ...sheet };
    let res = { ...resources };
    const conMod = getMod(getFinal(C, 'con'));
    const pools = getHitDicePools(C, s.usedHDPools, s.usedHD);
    const spendByPool = {};

    let totalHeal = 0;
    const rolls = [];
    pools.forEach((pool) => {
      const n = Math.max(0, Math.min(Number(hdToSpend[pool.key] || 0), pool.remaining));
      if (!n) return;
      spendByPool[pool.key] = n;
      for (let i = 0; i < n; i++) {
        const v = Math.floor(Math.random() * pool.faces) + 1;
        rolls.push({ v, faces: pool.faces, label: pool.label });
        totalHeal += v + conMod;
      }
    });
    const totalSpent = getUsedHitDiceTotal(spendByPool);

    const patch = {};
    if (totalSpent > 0) {
      s.currentHP = Math.min(s.maxHP, s.currentHP + totalHeal);
      const nextUsedPools = {};
      pools.forEach((pool) => {
        nextUsedPools[pool.key] = pool.used + (spendByPool[pool.key] || 0);
      });
      s.usedHDPools = nextUsedPools;
      s.usedHD = getUsedHitDiceTotal(nextUsedPools);
      Object.assign(patch, {
        currentHP: s.currentHP, tempHP: s.tempHP, maxHPBonus: s.maxHPBonus,
        usedHD: s.usedHD, usedHDPools: s.usedHDPools,
      });
    }

    if (C) {
      res = applyResourceRest(res, getAllResourceDefs(C), C, 'short');
      setResources(res);
      patch.resources = res;
      const nextFC = applyFreeCastRest(freeCastUses, getFreeCastDefsForCharacter(C), 'short');
      setFreeCastUses(nextFC);
      patch.freeCastUses = nextFC;
    }

    setSheet(s);
    if (Object.keys(patch).length) persist(patch);
    setShortRestOpen(false);
    if (totalSpent > 0) {
      showDiceToast('Short Rest', `Healed ${totalHeal} HP (${totalSpent} HD spent)`, totalHeal, rolls);
    } else {
      showNotice('Short Rest', 'Short Rest complete (no Hit Dice spent).');
    }
  }, [sheet, resources, freeCastUses, C, hdToSpend, persist, showDiceToast, showNotice]);

  const openLongRest = useCallback(() => {
    setLongRestOpen(true);
  }, []);

  const confirmLongRest = useCallback(() => {
    const s = { ...sheet };
    let res = { ...resources };
    s.currentHP = s.maxHP;
    s.tempHP = 0;
    s.usedHD = 0;
    s.usedHDPools = {};
    s.deathSaves = { success: 0, fail: 0 };
    s.spellSlotUsed = {};
    s.createdSpellSlots = {};
    const exRest = longRestExhaustionPatch(s);
    s.exhaustionLevel = exRest.exhaustionLevel;
    s.activeConditions = exRest.activeConditions;

    // Crafted items that last only until a Long Rest (Tinker's Magic, Fast
    // Crafting) vanish now. Replicate Magic Item items persist and are untouched.
    const prunedInv = clearCraftedByFlag(s.sheetInventory || [], VANISH_ON_LONG_REST_FLAGS);
    const inventoryVanished = prunedInv.length !== (s.sheetInventory || []).length;
    if (inventoryVanished) s.sheetInventory = prunedInv;

    const patch = {
      currentHP: s.currentHP, tempHP: s.tempHP, maxHPBonus: s.maxHPBonus,
      usedHD: 0, usedHDPools: {},
      deathSaves: s.deathSaves,
      spellSlotsUsed: {}, createdSpellSlots: {},
      exhaustionLevel: exRest.exhaustionLevel, activeConditions: exRest.activeConditions,
    };
    if (inventoryVanished) patch.inventory = prunedInv;

    if (C) {
      res = applyResourceRest(res, getAllResourceDefs(C), C, 'long');
      setResources(res);
      patch.resources = res;
      const nextFC = applyFreeCastRest(freeCastUses, getFreeCastDefsForCharacter(C), 'long');
      setFreeCastUses(nextFC);
      patch.freeCastUses = nextFC;
      Object.assign(patch, clearedToggles(C));
      Object.assign(patch, longRestCharacterPatch(C));
    }

    if (C?.speciesName) {
      const grants = installedRegistry.getSpeciesLongRestGrants(C.speciesName, C.speciesSource);
      if (grants?.inspiration) {
        s.sheetInspiration = true;
        patch.inspiration = true;
      }
    }

    setSheet(s);
    persist(patch);
    setLongRestOpen(false);
    showNotice('Long Rest', 'Fully restored!');
  }, [sheet, resources, freeCastUses, C, persist, showNotice]);

  const adjustHP = useCallback((dir, amount = 1) => {
    if (!sheet) return;
    const s = { ...sheet };
    const dmg = Math.max(1, Math.floor(amount || 1));
    if (dir > 0) {
      s.currentHP = Math.min(s.maxHP, s.currentHP + dmg);
    } else {
      let remaining = dmg;
      if (s.tempHP > 0) {
        const absorbed = Math.min(s.tempHP, remaining);
        s.tempHP -= absorbed;
        remaining -= absorbed;
      }
      s.currentHP = Math.max(0, s.currentHP - remaining);
    }
    const patch = { currentHP: s.currentHP, tempHP: s.tempHP, maxHPBonus: s.maxHPBonus };
    if (s.currentHP > 0) {
      s.deathSaves = { success: 0, fail: 0 };
      patch.deathSaves = s.deathSaves;
    }
    setSheet(s);
    persist(patch);
  }, [sheet, persist]);

  const adjustTempHP = useCallback((dir) => {
    if (!sheet) return;
    const s = { ...sheet, tempHP: Math.max(0, sheet.tempHP + dir) };
    setSheet(s);
    persist({ tempHP: s.tempHP });
  }, [sheet, persist]);

  const adjustMaxHpBonus = useCallback((dir) => {
    if (!sheet || !C) return;
    const s = { ...sheet, maxHPBonus: sheet.maxHPBonus + dir };
    const baseMax = Math.max(1, calcMaxHP(C));
    s.maxHP = Math.max(1, baseMax + s.maxHPBonus);
    if (s.currentHP > s.maxHP) s.currentHP = s.maxHP;
    setSheet(s);
    persist({ currentHP: s.currentHP, maxHPBonus: s.maxHPBonus });
  }, [sheet, C, persist]);

  const setCurrentHP = useCallback((next) => {
    if (!sheet) return;
    const s = { ...sheet, currentHP: Math.max(0, Math.min(sheet.maxHP, parseInt(next) || 0)) };
    const patch = { currentHP: s.currentHP, tempHP: s.tempHP, maxHPBonus: s.maxHPBonus };
    if (s.currentHP > 0) {
      s.deathSaves = { success: 0, fail: 0 };
      patch.deathSaves = s.deathSaves;
    }
    setSheet(s);
    persist(patch);
  }, [sheet, persist]);

  const setTempHP = useCallback((next) => {
    if (!sheet) return;
    const s = { ...sheet, tempHP: Math.max(0, parseInt(next) || 0) };
    setSheet(s);
    persist({ tempHP: s.tempHP });
  }, [sheet, persist]);

  const setMaxHpBonus = useCallback((next) => {
    if (!sheet || !C) return;
    const bonus = parseInt(next) || 0;
    const baseMax = Math.max(1, calcMaxHP(C));
    const s = { ...sheet, maxHPBonus: bonus, maxHP: Math.max(1, baseMax + bonus) };
    if (s.currentHP > s.maxHP) s.currentHP = s.maxHP;
    setSheet(s);
    persist({ currentHP: s.currentHP, maxHPBonus: s.maxHPBonus });
  }, [sheet, C, persist]);

  const setDeathSave = useCallback((type, count) => {
    if (!sheet) return;
    const value = Math.max(0, Math.min(3, count));
    const ds = { ...sheet.deathSaves, [type]: value };
    setSheet({ ...sheet, deathSaves: ds });
    persist({ deathSaves: ds });
  }, [sheet, persist]);

  const rollDeathSave = useCallback(() => {
    if (!sheet) return;
    if (sheet.currentHP > 0) {
      showNotice('Death Save', 'Available only at 0 HP');
      return;
    }
    if (sheet.deathSaves.success >= 3 || sheet.deathSaves.fail >= 3) {
      showNotice('Death Save', sheet.deathSaves.success >= 3 ? 'Already stable' : 'Character is dead');
      return;
    }
    const roll = Math.floor(Math.random() * 20) + 1;
    // A death saving throw is a D20 Test, so Exhaustion (−2/level) lowers the total
    // versus DC 10. The natural die still governs the crit (1 → two fails, 20 →
    // regain 1 HP) regardless of the penalty.
    const penalty = exhaustionD20Penalty(sheet.exhaustionLevel);
    const total = roll - penalty;
    const penaltyNote = penalty ? ` (Exhaustion −${penalty})` : '';
    const ds = { ...sheet.deathSaves };
    let extra = '';
    if (roll === 1) { ds.fail = Math.min(3, ds.fail + 2); }
    else if (roll === 20) {
      ds.success = 0; ds.fail = 0;
      const s = { ...sheet, deathSaves: ds, currentHP: Math.min(sheet.maxHP, 1) };
      setSheet(s);
      persist({ currentHP: s.currentHP, tempHP: s.tempHP, maxHPBonus: s.maxHPBonus, deathSaves: ds });
      showDiceToast('Death Save', 'Critical success: regain 1 HP', roll, [{ v: roll, faces: 20 }]);
      return;
    } else if (total >= 10) { ds.success = Math.min(3, ds.success + 1); }
    else { ds.fail = Math.min(3, ds.fail + 1); }

    if (ds.success >= 3) extra = 'Stable (0 HP).';
    else if (ds.fail >= 3) extra = 'Dead.';
    else extra = `${ds.success} success / ${ds.fail} fail`;
    setSheet({ ...sheet, deathSaves: ds });
    persist({ deathSaves: ds });
    showDiceToast('Death Save', extra + penaltyNote, total, [{ v: roll, faces: 20 }]);
  }, [sheet, persist, showDiceToast, showNotice]);

  // Exhaustion is graded (1–6), so it carries a level alongside its presence in
  // activeConditions. Level 0 removes it; >0 keeps the pill and drives penalties.
  const setExhaustion = useCallback((level) => {
    if (!sheet) return;
    const lvl = clampExhaustion(level);
    const present = sheet.activeConditions.includes('exhaustion');
    let next = sheet.activeConditions;
    if (lvl > 0 && !present) next = [...sheet.activeConditions, 'exhaustion'];
    else if (lvl === 0 && present) next = sheet.activeConditions.filter((k) => k !== 'exhaustion');
    const patch = { activeConditions: next, exhaustionLevel: lvl };
    // Level 6 = death (XPHB 2024): drop to 0 HP so the HP panel reflects it.
    if (lvl >= EXHAUSTION_MAX) patch.currentHP = 0;
    setSheet({ ...sheet, ...patch });
    persist(patch);
  }, [sheet, persist]);

  const toggleCondition = useCallback((key) => {
    if (!sheet) return;
    // Exhaustion toggles between level 0 and 1; the stepper sets exact levels.
    if (key === 'exhaustion') {
      setExhaustion(sheet.activeConditions.includes('exhaustion') ? 0 : 1);
      return;
    }
    const idx = sheet.activeConditions.indexOf(key);
    const next = [...sheet.activeConditions];
    if (idx >= 0) {
      next.splice(idx, 1);
    } else {
      next.push(key);
      // Apply conditions inherently imposed by this one (e.g. Unconscious also
      // grants Incapacitated + Prone), without duplicating already-active ones.
      (CONDITION_IMPLIES[key] || []).forEach((implied) => {
        if (!next.includes(implied)) next.push(implied);
      });
    }
    setSheet({ ...sheet, activeConditions: next });
    persist({ activeConditions: next });
  }, [sheet, persist, setExhaustion]);

  const clearConditions = useCallback(() => {
    if (!sheet) return;
    setSheet({ ...sheet, activeConditions: [], exhaustionLevel: 0 });
    persist({ activeConditions: [], exhaustionLevel: 0 });
  }, [sheet, persist]);

  const toggleInspiration = useCallback(() => {
    if (!sheet) return;
    const next = !sheet.sheetInspiration;
    setSheet({ ...sheet, sheetInspiration: next });
    persist({ inspiration: next });
  }, [sheet, persist]);

  const rollD20 = useCallback((bonus, label, advantage) => {
    // Exhaustion (XPHB 2024): −2 per level to every D20 Test. rollD20 is the single
    // executor for saves/checks/skills/attacks/initiative, so applying it here
    // covers all of them in one place.
    const exPenalty = exhaustionD20Penalty(sheet?.exhaustionLevel);
    const finalLabel = exPenalty ? `${label} (Exhaustion −${exPenalty})` : label;
    const result = rollD20Dice(bonus - exPenalty, {
      advantage: advantage === true ? true : advantage === false ? false : undefined,
    });
    showDiceToast(finalLabel, formatD20Detail(result), result.total, result.rolls, buildD20Meta(result));
  }, [showDiceToast, sheet]);

  const rollSave = useCallback((stat, options = {}) => {
    if (!C) return;
    const inventory = sheet?.sheetInventory || C?.inventory || [];
    // Wild Shape: merged equipment grants no save bonus (see SavingThrows panel).
    const bonus = getSaveBonus(C, stat) + aggregateSavingThrowBonus(itemEffectInventory(C, inventory));
    const lbl = stat.charAt(0).toUpperCase() + stat.slice(1) + ' Save';
    rollD20(bonus, lbl, options.disadvantage ? false : (options.advantage || undefined));
  }, [C, sheet, rollD20]);

  const rollSkill = useCallback((skillName, bonus, options = {}) => {
    rollD20(bonus, skillName + ' Check', options.disadvantage ? false : (options.advantage || undefined));
  }, [rollD20]);

  const updateXp = useCallback((val) => {
    const xp = parseInt(val) || 0;
    setSheet((prev) => ({ ...prev, xpStored: xp }));
    updateCurrentCharacter((prev) => ({ ...prev, xp }));
  }, [updateCurrentCharacter]);

  const updateNotes = useCallback((val) => {
    setSheet((prev) => ({ ...prev, notes: val }));
    persist({ notes: val });
  }, [persist]);

  const toggleFreeCast = useCallback((freeCast) => {
    setFreeCastUses((prev) => {
      const used = Math.max(0, Number(prev?.[freeCast.id] || 0));
      const max = Math.max(1, Number(freeCast.max || 1));
      const next = { ...(prev || {}) };
      if (used >= max) delete next[freeCast.id];
      else next[freeCast.id] = used + 1;
      persist({ freeCastUses: next });
      return next;
    });
  }, [persist]);

  const noop = useCallback(() => {}, []);

  // Stable, cross-cutting handlers shared with the deep tab/card tree via context.
  const sheetActions = useMemo(() => ({
    onRoll: rollD20,
    onShowToast: showDiceToast,
    setResources: saveResourcesState,
    onUpdateInventory: updateInventory,
    onUpdateCurrency: updateCurrency,
    onUpdateSpells: updateSpells,
    onUpdateSheet: syncSheet,
    onUpdateNotes: updateNotes,
    onUpdateCharacter: updateCurrentCharacter,
    onToggleFreeCast: toggleFreeCast,
  }), [
    rollD20, showDiceToast, saveResourcesState, updateInventory, updateCurrency,
    updateSpells, syncSheet, updateNotes, updateCurrentCharacter, toggleFreeCast,
  ]);

  // Read-only keeps navigation + dice rolls, but every data mutation becomes a
  // no-op (no spending slots, no adding items/spells, no HP/condition changes).
  const effectiveActions = useMemo(() => (
    readOnly
      ? {
          ...sheetActions,
          readOnly: true,
          setResources: noop,
          onUpdateInventory: noop,
          onUpdateCurrency: noop,
          onUpdateSpells: noop,
          onUpdateSheet: noop,
          onUpdateNotes: noop,
          onUpdateCharacter: noop,
          onToggleFreeCast: noop,
        }
      : { ...sheetActions, readOnly: false }
  ), [readOnly, sheetActions, noop]);

  if (!C || !sheet) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary', fontSize: '1.1rem' }}>
        No character found. Go back to the builder to create a character.
      </Box>
    );
  }

  const hitDicePools = getHitDicePools(C, sheet.usedHDPools, sheet.usedHD);
  const totalHitDiceRemaining = hitDicePools.reduce((sum, pool) => sum + pool.remaining, 0);
  const totalHitDiceToSpend = getUsedHitDiceTotal(hdToSpend);
  const conMod = getMod(getFinal(C, 'con'));
  const sheetGridSx = embedded ? EMBEDDED_SHEET_GRID : SHEET_GRID;

  return (
    <ProficiencySetsProvider character={C}>
    <SheetActionsProvider value={effectiveActions}>
    <Box sx={{ minHeight: embedded ? 'auto' : '100vh', bgcolor: 'background.default', pb: embedded ? 1 : 4, width: '100%' }}>
      <TopBar C={C} sheet={sheet} charId={charId} readOnly={readOnly} embedded={embedded} onShortRest={openShortRest} onLongRest={openLongRest} onUpdateXp={updateXp} onUpdateCharacter={updateCurrentCharacter}
        rollLog={rollLog} onClearRollLog={() => setRollLog([])} onShowToast={showDiceToast} />
      <Box sx={{ maxWidth: embedded ? 'none' : 1280, mx: embedded ? 0 : { md: 'auto' }, px: embedded ? 0 : { xs: '0.6rem', md: '1.1rem' }, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: 'rgba(35,32,26,1)', borderBottom: 1, borderColor: 'divider', py: '0.55rem', px: embedded ? '0.45rem' : { xs: '0.45rem', md: '0.6rem' } }}>
          <Stack direction={embedded ? 'column' : { xs: 'column', md: 'row-reverse' }} spacing={0.6} sx={{ alignItems: embedded ? 'stretch' : { md: 'stretch' } }}>
            <HPBlock sheet={sheet}
              onHeal={readOnly ? noop : (amt) => adjustHP(1, amt)} onDamage={readOnly ? noop : (amt) => adjustHP(-1, amt)}
              onTempHP={readOnly ? noop : adjustTempHP} onMaxHPBonus={readOnly ? noop : adjustMaxHpBonus}
              onSetHP={readOnly ? noop : setCurrentHP} onSetTempHP={readOnly ? noop : setTempHP} onSetMaxHPBonus={readOnly ? noop : setMaxHpBonus}
              onDeathSave={readOnly ? noop : rollDeathSave} onDeathSaveSet={readOnly ? noop : setDeathSave} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AbilityScores C={C} sheet={sheet} onRoll={rollD20} />
            </Box>
          </Stack>
        </Box>
        <Box sx={{
          display: 'grid',
          width: '100%',
          ...sheetGridSx,
          pt: '0.55rem',
          alignItems: 'start',
          minWidth: 0,
        }}>
          {/* Left column: `display: contents` on xs lets each child participate in the
              outer grid via its own gridArea. On md the wrapper collapses into a single
              `leftCol` grid cell containing the panels as flex children, decoupling
              their row heights from the right column. */}
          <Box sx={{
            display: embedded ? 'contents' : { xs: 'contents', md: 'flex' },
            flexDirection: embedded ? undefined : { md: 'column' },
            gap: embedded ? undefined : { md: '0.55rem' },
            gridArea: embedded ? undefined : { md: SHEET_AREAS.leftCol },
            ...SHEET_GRID_ITEM_SX,
          }}>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.saves } }}>
              <SavingThrows C={C} sheet={sheet} onRoll={rollSave} />
            </Box>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.senses } }}>
              <Senses C={C} />
            </Box>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.movement } }}>
              <Movement C={C} sheet={sheet} />
            </Box>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.profs } }}>
              <Proficiencies C={C} />
            </Box>
          </Box>
          <Box sx={{ ...SHEET_GRID_ITEM_SX, gridArea: SHEET_AREAS.skills }}>
            <Skills C={C} sheet={sheet} onRoll={rollSkill} />
          </Box>
          <Stack spacing={0.55} sx={{ ...SHEET_GRID_ITEM_SX, gridArea: SHEET_AREAS.right }}>
            <RightTop C={C} sheet={sheet} onRoll={rollD20}
              onToggleCondition={readOnly ? noop : toggleCondition} onClearConditions={readOnly ? noop : clearConditions}
              onSetExhaustion={readOnly ? noop : setExhaustion}
              conditionEntries={conditionEntries}
              onToggleInspiration={readOnly ? noop : toggleInspiration}
              resources={resources} setResources={readOnly ? noop : saveResourcesState} onShowToast={showDiceToast} />
            <TabsPanel C={C} sheet={sheet} tab={tab} setTab={setTab}
              resources={resources} freeCastUses={freeCastUses} />
          </Stack>
        </Box>
      </Box>
      {diceToast && <DiceToast toast={diceToast} onClose={() => setDiceToast(null)} />}

      <SheetDialog
        open={shortRestOpen}
        onClose={() => setShortRestOpen(false)}
        title="Short Rest"
        icon={<Hourglass size={20} />}
        actions={(
          <>
            <Button onClick={() => setShortRestOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={confirmShortRest}>
              Take Short Rest
            </Button>
          </>
        )}
      >
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
          Optionally spend Hit Dice to recover HP. Each die adds CON mod ({conMod}). Resources that recharge on a Short Rest will still recover even if you spend no Hit Dice.
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 1 }}>
          Available: {totalHitDiceRemaining} HD
        </Typography>
        <Stack spacing={1.25}>
          {hitDicePools.map((pool) => {
            const value = Math.max(0, Math.min(Number(hdToSpend[pool.key] || 0), pool.remaining));
            return (
              <HitDiceSpendControl
                key={pool.key}
                pool={pool}
                value={value}
                conMod={conMod}
                onChange={(next) => setHdToSpend((prev) => ({ ...prev, [pool.key]: next }))}
              />
            );
          })}
        </Stack>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', textAlign: 'center', mt: 1.25 }}>
          {totalHitDiceToSpend > 0 ? `Spending ${totalHitDiceToSpend} HD` : 'No Hit Dice will be spent'}
        </Typography>
      </SheetDialog>

      <SheetDialog
        open={longRestOpen}
        onClose={() => setLongRestOpen(false)}
        title="Take a Long Rest?"
        icon={<Moon size={20} />}
        actions={(
          <>
            <Button onClick={() => setLongRestOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={confirmLongRest}>Confirm Long Rest</Button>
          </>
        )}
      >
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          This will restore all HP, Hit Dice, spell slots, and class resources.
        </Typography>
      </SheetDialog>
    </Box>
    </SheetActionsProvider>
    </ProficiencySetsProvider>
  );
}
