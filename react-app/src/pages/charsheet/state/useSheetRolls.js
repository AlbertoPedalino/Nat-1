import { useCallback, useEffect, useState } from 'react';
import {
  buildD20Meta,
  formatD20Detail,
  rollD20 as rollD20Dice,
} from '../../../shared/character/dice/dice.js';
import { characterItemBonuses } from '../../../shared/character/inventory/itemBonus.js';
import { getSaveBonus, exhaustionD20Penalty } from '../../../shared/character/sheet/sheetStats.js';
import { useRollChannel } from '../../../shared/cloud/sync/useRollChannel.js';
import { useCharacterCampaign } from '../../../shared/cloud/sync/useCharacterCampaign.js';
import { normalizeRoll } from '../../../shared/vtt/rolls/rollFeed.js';
import { capitalize } from '../../../shared/ui/textCase.js';
import { makeId } from '../../../shared/ids.js';

// Every roll and notice on the sheet: the dice toast, the roll log (this sheet's
// rolls plus the campaign's), publishing to the campaign, and the D20 executor
// used by saves, checks, skills, attacks and initiative.
export function useSheetRolls({ C, sheet, charId, onRoll, showOwnRollToast }) {
  const [diceToast, setDiceToast] = useState(null);
  const campaignId = useCharacterCampaign(charId);
  // Rolls are shared with the campaign, not with a scene: this sheet has no idea
  // which map is up and does not need to learn.
  const [rollLog, setRollLog] = useState([]);
  const receiveRoll = useCallback((entry) => {
    const roll = normalizeRoll(entry);
    if (!roll || roll.visibility === 'gm') return;
    const toastEntry = {
      ...roll, timestamp: roll.at, meta: { mode: roll.mode, bonus: roll.bonus },
    };
    setRollLog((current) => current.some((item) => item.id === roll.id)
      ? current : [toastEntry, ...current].slice(0, 50));
  }, []);
  const { publish: publishRoll } = useRollChannel({ campaignId, onRoll: receiveRoll });
  useEffect(() => { setRollLog([]); }, [campaignId, charId]);

  const showDiceToast = useCallback((label, detail, total, rolls, meta) => {
    const timestamp = Date.now();
    const entry = {
      id: makeId('sheet'),
      label,
      detail,
      total,
      rolls,
      meta,
      // A map that is currently open should replay these dice physically. The
      // published values stay authoritative; DiceTray paints them onto the
      // faces that naturally land, so there is no final snap or contradiction.
      thrown: Boolean(rolls?.length),
      timestamp,
      characterId: charId,
      actorName: C?.name || '',
      actorColor: C?.classIconColor || null,
    };
    if (showOwnRollToast) setDiceToast(entry);
    setRollLog((prev) => [entry, ...prev].slice(0, 50));
    // Said out loud at the table: the same entry the toast shows, so a roll
    // reads on the battle map exactly as it read here. Every roll on this sheet
    // goes through this one function, custom rolls included.
    const sharedEntry = { ...entry, characterId: charId, actorName: C?.name || '' };
    publishRoll(sharedEntry);
    // Also hand off directly while campaign metadata is still loading.
    // The map deduplicates the shared event by id.
    onRoll?.(sharedEntry);
  }, [C?.name, C?.classIconColor, charId, onRoll, publishRoll, showOwnRollToast]);

  // Non-dice events (rests, death-save guards): no roll, no numeric total — just a
  // labelled message. Routes through the same toast so DiceToast renders the detail.
  const showNotice = useCallback((label, message) => {
    showDiceToast(label, message, null, []);
  }, [showDiceToast]);

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
    // Wild Shape: merged equipment grants no save bonus.
    const bonus = getSaveBonus(C, stat) + characterItemBonuses(C, inventory).savingThrow;
    const lbl = capitalize(stat) + ' Save';
    rollD20(bonus, lbl, options.disadvantage ? false : (options.advantage || undefined));
  }, [C, sheet, rollD20]);

  const rollSkill = useCallback((skillName, bonus, options = {}) => {
    rollD20(bonus, skillName + ' Check', options.disadvantage ? false : (options.advantage || undefined));
  }, [rollD20]);

  return {
    diceToast,
    setDiceToast,
    rollLog,
    setRollLog,
    showDiceToast,
    showNotice,
    rollD20,
    rollSave,
    rollSkill,
  };
}
