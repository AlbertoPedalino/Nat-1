import { useState, useEffect, useCallback } from 'react';
import { Box, Stack, Button, Dialog, DialogActions, DialogContent, DialogTitle, Slider, Typography } from '@mui/material';
import TopBar from './components/TopBar.jsx';
import AbilityScores from './components/AbilityScores.jsx';
import HPBlock from './components/HPBlock.jsx';
import SavingThrows from './components/SavingThrows.jsx';
import Senses from './components/Senses.jsx';
import Proficiencies from './components/Proficiencies.jsx';
import HitDice from './components/HitDice.jsx';
import Skills from './components/Skills.jsx';
import Movement from './components/Movement.jsx';
import RightTop from './components/RightTop.jsx';
import TabsPanel from './components/TabsPanel.jsx';
import DiceToast from './components/DiceToast.jsx';
import { deriveSheetState } from './state.js';
import { calcMaxHP, getMod, getFinal, getPB, getSaveBonus } from './logic/calculations.js';
import { applyResourceRest, getAllResourceDefs, getHitDicePools, getUsedHitDiceTotal, normalizeResourceMax } from './logic/restResources.js';
import { applyFreeCastRest, getFreeCastDefsForCharacter } from './logic/spellsTabLogic.js';
import { loadCoreAdapters, loadClassAdapters, installedRegistry } from '../../adapters/index.js';
import {
  getActiveCharId,
  loadCharacter as storeLoadCharacter,
  patchCharacter as storePatchCharacter,
  setActiveCharId,
} from '../../shared/character/store.js';

function getCharIdFromUrl() {
  return new URLSearchParams(window.location.search).get('char') || getActiveCharId();
}

export default function CharacterSheet() {
  const [C, setC] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [charId, setCharId] = useState(null);
  const [tab, setTab] = useState(0);
  const [diceToast, setDiceToast] = useState(null);
  const [rollLog, setRollLog] = useState([]);
  const [resources, setResources] = useState({});
  const [freeCastUses, setFreeCastUses] = useState({});
  const [shortRestOpen, setShortRestOpen] = useState(false);
  const [longRestOpen, setLongRestOpen] = useState(false);
  const [hdToSpend, setHdToSpend] = useState({});

  useEffect(() => {
    let alive = true;
    const id = getCharIdFromUrl();
    const ch = id ? storeLoadCharacter(id) : null;
    if (id && ch) setActiveCharId(id);

    const classNames = [ch?.className, ...(ch?.extraClasses || []).map((extra) => extra.name)].filter(Boolean);
    const context = { getMod, getFinal, getPB };

    Promise.all([
      loadCoreAdapters(context),
      loadClassAdapters(classNames, context),
    ]).finally(() => {
      if (!alive) return;
      setCharId(id);
      setC(ch);
      if (ch) {
        setSheet(deriveSheetState(ch));
        const stored = ch.resources && typeof ch.resources === 'object' ? ch.resources : {};
        const allResDefs = getAllResourceDefs(ch);
        const merged = { ...stored };
        allResDefs.forEach((def) => {
          if (def.key && merged[def.key] == null) {
            merged[def.key] = normalizeResourceMax(def, ch);
          }
        });
        setResources(merged);
        if (id) storePatchCharacter(id, { resources: merged });
        setFreeCastUses(ch.freeCastUses && typeof ch.freeCastUses === 'object' ? ch.freeCastUses : {});
      }
    });

    return () => { alive = false; };
  }, []);

  const persist = useCallback((patch) => {
    if (!charId || !patch) return;
    const next = storePatchCharacter(charId, patch);
    if (next) setC(next);
  }, [charId]);

  const syncSheet = useCallback((updates) => {
    setSheet((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateCurrentCharacter = useCallback((updater) => {
    setC((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (charId) storePatchCharacter(charId, next);
      return next;
    });
  }, [charId]);

  const updateInventory = useCallback((inventory) => {
    setSheet((prev) => ({ ...prev, sheetInventory: inventory }));
    updateCurrentCharacter((prev) => ({ ...prev, inventory }));
  }, [updateCurrentCharacter]);

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

  const saveFreeCastState = useCallback((next) => {
    setFreeCastUses(next);
    persist({ freeCastUses: next });
  }, [persist]);

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
    const msg = totalSpent > 0
      ? `Healed ${totalHeal} HP (${totalSpent} HD spent)`
      : 'Short Rest complete (no Hit Dice spent).';
    showDiceToast('Short Rest', msg, totalHeal, rolls);
  }, [sheet, resources, freeCastUses, C, hdToSpend, persist]);

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

    const patch = {
      currentHP: s.currentHP, tempHP: s.tempHP, maxHPBonus: s.maxHPBonus,
      usedHD: 0, usedHDPools: {},
      deathSaves: s.deathSaves,
      spellSlotsUsed: {}, createdSpellSlots: {},
    };

    if (C) {
      res = applyResourceRest(res, getAllResourceDefs(C), C, 'long');
      setResources(res);
      patch.resources = res;
      const nextFC = applyFreeCastRest(freeCastUses, getFreeCastDefsForCharacter(C), 'long');
      setFreeCastUses(nextFC);
      patch.freeCastUses = nextFC;
      if (C.bladesongActive) patch.bladesongActive = false;
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
    showDiceToast('Long Rest', 'Fully restored!', 0, []);
  }, [sheet, resources, freeCastUses, C, persist]);

  const doRest = useCallback((type) => {
    const s = { ...sheet };
    let res = { ...resources };
    const patch = {};
    if (type === 'long') {
      s.currentHP = s.maxHP;
      s.tempHP = 0;
      s.usedHD = 0;
      s.deathSaves = { success: 0, fail: 0 };
      s.spellSlotUsed = {};
      s.createdSpellSlots = {};
      s.usedHDPools = {};
      Object.assign(patch, {
        currentHP: s.currentHP, tempHP: 0, maxHPBonus: s.maxHPBonus,
        usedHD: 0, usedHDPools: {},
        deathSaves: s.deathSaves,
        spellSlotsUsed: {}, createdSpellSlots: {},
      });
      if (C?.speciesName) {
        const grants = installedRegistry.getSpeciesLongRestGrants(C.speciesName, C.speciesSource);
        if (grants?.inspiration) {
          s.sheetInspiration = true;
          patch.inspiration = true;
        }
      }
    } else {
      Object.assign(patch, {
        currentHP: s.currentHP, tempHP: s.tempHP, maxHPBonus: s.maxHPBonus,
        usedHD: s.usedHD, usedHDPools: s.usedHDPools || {},
      });
    }
    if (C) {
      res = applyResourceRest(res, getAllResourceDefs(C), C, type);
      setResources(res);
      patch.resources = res;
      const nextFC = applyFreeCastRest(freeCastUses, getFreeCastDefsForCharacter(C), type);
      setFreeCastUses(nextFC);
      patch.freeCastUses = nextFC;
    }
    setSheet(s);
    persist(patch);
  }, [sheet, resources, freeCastUses, C, persist]);

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

  const rollDeathSave = useCallback(() => {
    if (!sheet) return;
    if (sheet.currentHP > 0) {
      showDiceToast('Death Save', 'Available only at 0 HP', 0, []);
      return;
    }
    if (sheet.deathSaves.success >= 3 || sheet.deathSaves.fail >= 3) {
      showDiceToast('Death Save', sheet.deathSaves.success >= 3 ? 'Already stable' : 'Character is dead', 0, []);
      return;
    }
    const roll = Math.floor(Math.random() * 20) + 1;
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
    } else if (roll >= 10) { ds.success = Math.min(3, ds.success + 1); }
    else { ds.fail = Math.min(3, ds.fail + 1); }

    if (ds.success >= 3) extra = 'Stable (0 HP).';
    else if (ds.fail >= 3) extra = 'Dead.';
    else extra = `${ds.success} success / ${ds.fail} fail`;
    setSheet({ ...sheet, deathSaves: ds });
    persist({ deathSaves: ds });
    showDiceToast('Death Save', extra, roll, [{ v: roll, faces: 20 }]);
  }, [sheet, persist]);

  const toggleCondition = useCallback((key) => {
    if (!sheet) return;
    const idx = sheet.activeConditions.indexOf(key);
    const next = [...sheet.activeConditions];
    if (idx >= 0) next.splice(idx, 1);
    else next.push(key);
    setSheet({ ...sheet, activeConditions: next });
    persist({ activeConditions: next });
  }, [sheet, persist]);

  const clearConditions = useCallback(() => {
    if (!sheet) return;
    setSheet({ ...sheet, activeConditions: [] });
    persist({ activeConditions: [] });
  }, [sheet, persist]);

  const toggleInspiration = useCallback(() => {
    if (!sheet) return;
    const next = !sheet.sheetInspiration;
    setSheet({ ...sheet, sheetInspiration: next });
    persist({ inspiration: next });
  }, [sheet, persist]);

  const showDiceToast = useCallback((label, detail, total, rolls, meta) => {
    const entry = { label, detail, total, rolls, meta, timestamp: Date.now() };
    setDiceToast(entry);
    setRollLog((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  const rollD20 = useCallback((bonus, label, advantage) => {
    const b = Number(bonus) || 0;
    const bonusText = b >= 0 ? `+${b}` : `${b}`;
    if (advantage === true) {
      const r1 = Math.floor(Math.random() * 20) + 1;
      const r2 = Math.floor(Math.random() * 20) + 1;
      const best = Math.max(r1, r2);
      showDiceToast(label, `Advantage: keep ${best}; d20 ${bonusText} = ${best + b}`, best + b, [{ v: r1, faces: 20, kept: r1 >= r2 }, { v: r2, faces: 20, kept: r2 > r1 }], { bonus: b, mode: 'advantage', kept: best });
    } else if (advantage === false) {
      const r1 = Math.floor(Math.random() * 20) + 1;
      const r2 = Math.floor(Math.random() * 20) + 1;
      const worst = Math.min(r1, r2);
      showDiceToast(label, `Disadvantage: keep ${worst}; d20 ${bonusText} = ${worst + b}`, worst + b, [{ v: r1, faces: 20, kept: r1 <= r2 }, { v: r2, faces: 20, kept: r2 < r1 }], { bonus: b, mode: 'disadvantage', kept: worst });
    } else {
      const r = Math.floor(Math.random() * 20) + 1;
      showDiceToast(label, `d20 ${bonusText} = ${r + b}`, r + b, [{ v: r, faces: 20, kept: true }], { bonus: b, kept: r });
    }
  }, [showDiceToast]);

  const rollSave = useCallback((stat, options = {}) => {
    if (!C) return;
    const bonus = getSaveBonus(C, stat);
    const lbl = stat.charAt(0).toUpperCase() + stat.slice(1) + ' Save';
    rollD20(bonus, lbl, options.disadvantage ? false : (options.advantage || undefined));
  }, [C, rollD20]);

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

  const downloadSheet = useCallback(() => {
    if (!C) return;
    const data = JSON.stringify({ type: 'gb-sheet-export', data: C, version: 1 }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${C.name || 'character'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [C]);

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4, width: '100%' }}>
      <TopBar C={C} sheet={sheet} onShortRest={openShortRest} onLongRest={openLongRest} onDownload={downloadSheet} onUpdateXp={updateXp} onUpdateCharacter={updateCurrentCharacter}
        rollLog={rollLog} onClearRollLog={() => setRollLog([])} />
      <Box sx={{ maxWidth: 1280, mx: { md: 'auto' }, px: { xs: '0.6rem', md: '1.1rem' }, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: 'rgba(35,32,26,1)', borderBottom: 1, borderColor: 'divider', py: '0.55rem' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={0.6} alignItems={{ md: 'stretch' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AbilityScores C={C} sheet={sheet} onRoll={rollD20} />
            </Box>
            <HPBlock sheet={sheet}
              onHeal={(amt) => adjustHP(1, amt)} onDamage={(amt) => adjustHP(-1, amt)}
              onTempHP={adjustTempHP} onMaxHPBonus={adjustMaxHpBonus} onSetHP={setCurrentHP} onDeathSave={rollDeathSave} />
          </Stack>
        </Box>
        <Box sx={{
          display: 'grid',
          width: '100%',
          gridTemplateColumns: { xs: '1fr', md: '200px 210px 1fr' },
          gap: '0.55rem',
          pt: '0.55rem',
          alignItems: 'start',
          minWidth: 0,
        }}>
          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
            <SavingThrows C={C} sheet={sheet} onRoll={rollSave} />
            <Senses C={C} />
            <Movement C={C} sheet={sheet} />
            <Proficiencies C={C} />
            <HitDice C={C} sheet={sheet} />
          </Box>
          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
            <Skills C={C} sheet={sheet} onRoll={rollSkill} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <RightTop C={C} sheet={sheet} onRoll={rollD20}
              onToggleCondition={toggleCondition} onClearConditions={clearConditions}
              onToggleInspiration={toggleInspiration}
              resources={resources} setResources={saveResourcesState} onShowToast={showDiceToast} />
            <TabsPanel C={C} sheet={sheet} tab={tab} setTab={setTab} onRoll={rollD20}
              resources={resources} setResources={saveResourcesState}
              freeCastUses={freeCastUses}
              onToggleFreeCast={(freeCast) => {
                setFreeCastUses((prev) => {
                  const used = Math.max(0, Number(prev?.[freeCast.id] || 0));
                  const max = Math.max(1, Number(freeCast.max || 1));
                  const next = { ...(prev || {}) };
                  if (used >= max) delete next[freeCast.id];
                  else next[freeCast.id] = used + 1;
                  persist({ freeCastUses: next });
                  return next;
                });
              }}
              onRest={doRest} onShowToast={showDiceToast}
              onUpdateInventory={updateInventory} onUpdateCurrency={updateCurrency} onUpdateSpells={updateSpells} onUpdateSheet={syncSheet} onUpdateNotes={updateNotes}
              onUpdateCharacter={updateCurrentCharacter} />
          </Box>
        </Box>
      </Box>
      {diceToast && <DiceToast toast={diceToast} onClose={() => setDiceToast(null)} />}

      <Dialog open={shortRestOpen} onClose={() => setShortRestOpen(false)} maxWidth="xs" fullWidth slotProps={sheetDialogSlotProps}>
        <DialogTitle sx={sheetDialogTitleSx}>Short Rest</DialogTitle>
        <DialogContent sx={sheetDialogContentSx}>
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
                <Box key={pool.key} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: 'rgba(35,32,26,0.72)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.72rem', color: 'primary.main', flex: 1 }}>
                      {pool.label} d{pool.faces}
                    </Typography>
                    <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
                      {pool.remaining}/{pool.total} left
                    </Typography>
                  </Box>
                  <Slider
                    value={value}
                    onChange={(_, next) => setHdToSpend((prev) => ({ ...prev, [pool.key]: next }))}
                    min={0}
                    max={Math.max(1, pool.remaining)}
                    step={1}
                    marks
                    disabled={pool.remaining === 0}
                    valueLabelDisplay="auto"
                    sx={{ color: '#caa550', my: 0.25 }}
                  />
                  <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', textAlign: 'right' }}>
                    Spend: {value}d{pool.faces}{conMod >= 0 ? '+' : ''}{conMod} each
                  </Typography>
                </Box>
              );
            })}
          </Stack>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', textAlign: 'center', mt: 1.25 }}>
            {totalHitDiceToSpend > 0 ? `Spending ${totalHitDiceToSpend} HD` : 'No Hit Dice will be spent'}
          </Typography>
        </DialogContent>
        <DialogActions sx={sheetDialogActionsSx}>
          <Button onClick={() => setShortRestOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={confirmShortRest}>
            Take Short Rest
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={longRestOpen} onClose={() => setLongRestOpen(false)} maxWidth="xs" fullWidth slotProps={sheetDialogSlotProps}>
        <DialogTitle sx={sheetDialogTitleSx}>Take a Long Rest?</DialogTitle>
        <DialogContent sx={sheetDialogContentSx}>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            This will restore all HP, Hit Dice, spell slots, and class resources.
          </Typography>
        </DialogContent>
        <DialogActions sx={sheetDialogActionsSx}>
          <Button onClick={() => setLongRestOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={confirmLongRest}>Confirm Long Rest</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const sheetDialogSlotProps = {
  paper: {
    sx: {
      bgcolor: 'rgba(26,23,19,0.98)',
      border: 1,
      borderColor: 'divider',
      borderRadius: 1,
      backgroundImage: 'none',
      boxShadow: '0 18px 52px rgba(0,0,0,0.62)',
    },
  },
};

const sheetDialogTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  color: '#edd48a',
  bgcolor: 'rgba(35,32,26,1)',
  borderBottom: 1,
  borderColor: 'divider',
  fontSize: '1rem',
  letterSpacing: '0.06em',
};

const sheetDialogContentSx = {
  bgcolor: 'rgba(26,23,19,0.98)',
  pt: 2,
};

const sheetDialogActionsSx = {
  px: 3,
  pb: 2,
  bgcolor: 'rgba(26,23,19,0.98)',
  borderTop: 1,
  borderColor: 'divider',
};
