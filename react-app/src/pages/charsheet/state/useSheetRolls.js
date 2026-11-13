import { useCallback, useEffect, useState } from 'react';
import { createValueStore } from '../../../shared/valueStore.js';
import {
  buildD20Meta,
  formatD20Detail,
  rollD20 as rollD20Dice,
} from '../../../shared/character/dice/dice.js';
import { customRollToast } from '../../../shared/character/dice/customRoll.js';
import { characterItemBonuses } from '../../../shared/character/inventory/itemBonus.js';
import { getSaveBonus, exhaustionD20Penalty } from '../../../shared/character/sheet/sheetStats.js';
import { useRollChannel } from '../../../shared/cloud/sync/useRollChannel.js';
import { rollVisibility } from '../../../shared/cloud/sync/rollVisibility.js';
import { useCharacterCampaign } from '../../../shared/cloud/sync/useCharacterCampaign.js';
import { addRoll, makeRollEntry, normalizeRoll } from '../../../shared/vtt/rolls/rollFeed.js';
import { capitalize } from '../../../shared/ui/textCase.js';
import { makeId } from '../../../shared/ids.js';

// Every roll and notice on the sheet: the dice toast, the roll log (this sheet's
// rolls plus the campaign's), publishing to the campaign, and the D20 executor
// used by saves, checks, skills, attacks and initiative.
//
// The toast and the log are stores (valueStore.js), not the sheet's state: a
// roll — this player's or anyone's in the campaign — redraws the toast and the
// dice dock that read them (SheetDiceToast, SheetDiceDock), not the whole
// sheet.
export function useSheetRolls({ C, sheet, charId, onRoll, showOwnRollToast }) {
  const [{ toastStore, logStore }] = useState(() => ({
    toastStore: createValueStore(null),
    logStore: createValueStore([]),
  }));
  const setDiceToast = toastStore.set;
  const campaignId = useCharacterCampaign(charId);
  // Rolls are shared with the campaign, not with a scene: this sheet has no idea
  // which map is up and does not need to learn.
  const setRollLog = logStore.set;
  const receiveRoll = useCallback((entry) => {
    if (normalizeRoll(entry)?.visibility === 'gm') return;
    setRollLog((current) => addRoll(current, entry));
  }, []);
  const { publish: publishRoll } = useRollChannel({ campaignId, onRoll: receiveRoll });
  useEffect(() => { setRollLog([]); }, [campaignId, charId]);

  const showDiceToast = useCallback((label, detail, total, rolls, meta) => {
    // Thrown (makeRollEntry) whenever it has dice: a map that is open replays
    // them physically. The published values stay authoritative; DiceTray
    // paints them onto the faces that naturally land.
    const entry = makeRollEntry({
      label, detail, total, rolls, meta,
    }, {
      idPrefix: 'sheet',
      actorName: C?.name || '',
      identity: { actorColor: C?.classIconColor },
      characterId: charId,
      visibility: rollVisibility('player'),
    });
    if (showOwnRollToast) setDiceToast(entry);
    setRollLog((prev) => addRoll(prev, entry, { local: true }));
    // Said out loud at the table: the same entry the toast shows, so a roll
    // reads on the battle map exactly as it read here. Every roll on this sheet
    // goes through this one function, custom rolls included.
    publishRoll(entry, { visibility: entry.visibility });
    // Also hand off directly while campaign metadata is still loading.
    // The map deduplicates the shared event by id.
    onRoll?.(entry);
  }, [C?.name, C?.classIconColor, charId, onRoll, publishRoll, showOwnRollToast]);

  // A roll from the custom roll picker (the dice dock), as the map rolls one.
  const rollCustom = useCallback((formula) => {
    const toast = customRollToast(formula);
    if (toast) showDiceToast(toast.label, toast.detail, toast.total, toast.rolls, toast.meta);
  }, [showDiceToast]);

  // Gameplay notices (a rest taken, not enough Sorcery Points, a choice made):
  // shown in the same toast as a roll, but they are not rolls — they stay out of
  // the roll log and off the table's channel. Shown even where the sheet leaves
  // its own rolls to the map's toast, since nothing else will show them.
  const showNotice = useCallback((label, message) => {
    setDiceToast({
      id: makeId('notice'), label, detail: message, total: null, rolls: [], timestamp: Date.now(), notice: true,
    });
  }, []);

  // `options.critOn`: an attack's improved critical range (getCritRange).
  const rollD20 = useCallback((bonus, label, advantage, options = {}) => {
    // Exhaustion (XPHB 2024): −2 per level to every D20 Test. rollD20 is the single
    // executor for saves/checks/skills/attacks/initiative, so applying it here
    // covers all of them in one place.
    const exPenalty = exhaustionD20Penalty(sheet?.exhaustionLevel);
    const finalLabel = exPenalty ? `${label} (Exhaustion −${exPenalty})` : label;
    const result = rollD20Dice(bonus - exPenalty, {
      advantage: advantage === true ? true : advantage === false ? false : undefined,
    });
    showDiceToast(finalLabel, formatD20Detail(result), result.total, result.rolls, buildD20Meta(result, options));
  }, [showDiceToast, sheet]);

  const rollSave = useCallback((stat, options = {}) => {
    if (!C) return;
    const inventory = sheet?.sheetInventory || C?.inventory || [];
    // Wild Shape: merged equipment grants no save bonus.
    const bonus = getSaveBonus(C, stat) + characterItemBonuses(C, inventory).savingThrow;
    const lbl = capitalize(stat) + ' Save';
    rollD20(bonus, lbl, options.disadvantage ? false : (options.advantage || undefined), { kind: 'save' });
  }, [C, sheet, rollD20]);

  const rollSkill = useCallback((skillName, bonus, options = {}) => {
    rollD20(bonus, skillName + ' Check', options.disadvantage ? false : (options.advantage || undefined), { kind: 'skill' });
  }, [rollD20]);

  return {
    toastStore,
    logStore,
    showDiceToast,
    showNotice,
    rollCustom,
    rollD20,
    rollSave,
    rollSkill,
  };
}
