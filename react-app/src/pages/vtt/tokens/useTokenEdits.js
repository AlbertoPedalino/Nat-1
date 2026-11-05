import { useCallback } from 'react';
import { tokenHealthCommand } from '../../../shared/vtt/tokens/characterHealth.js';
import { clampDeathSaveCount, normalizeDeathSaves } from '../../../shared/character/combat/vitals.js';
import {
  DEAD_CONDITION_KEY,
  setConditionActive,
} from '../../../shared/character/combat/conditions.js';
import {
  deleteToken,
  setTokenConditions,
  setTokenEffects,
  setTokenHp,
  setTokenSecret,
  updateToken,
} from '../../../shared/cloud/api/vtt.js';
import { useTokenVitalCommands } from './useTokenVitalCommands.js';
import {
  FIGHT_UNAVAILABLE,
  commitFightCombatantVitals,
} from '../../../shared/cloud/api/encounterFights.js';
import { parseSourceRef } from '../../../shared/vtt/tokens/encounterSync.js';
import {
  monsterEditFromToken,
  monsterVitalsBase,
  monsterVitalsPatch,
} from '../../../shared/vtt/tokens/fightVitals.js';

// Changing pieces already on the scene: conditions, reminders, HP and the rest
// of the token menu, death saves, visibility, deletion. A character's vitals go
// to its sheet (health commands); an imported monster's go to its fight row
// (commit_fight_combatant_vitals); a loose piece's to its map_tokens row.
export function useTokenEdits({
  role, notify, tokens, setTokens, canMove, characterHealth, gmVitals, refreshVisibleTokens,
  setBusy,
}) {
  const commitLinkedMonster = useCallback(async (token, edit) => {
    const ref = token.characterId ? null : parseSourceRef(token.sourceRef);
    if (!ref) return false;
    const { before, after } = monsterEditFromToken(token, edit);
    const patch = monsterVitalsPatch(before, after);
    if (!Object.keys(patch).length) return true;
    try {
      const { applied } = await commitFightCombatantVitals(ref.fightId, ref.combatantId, {
        base: { hpCurrent: monsterVitalsBase(before).hpCurrent, hpMax: monsterVitalsBase(before).hpMax },
        patch,
      });
      if (!applied) {
        notify('warning', 'This creature changed elsewhere. Showing the latest values; try again if needed.');
        refreshVisibleTokens();
      }
      return true;
    } catch (cause) {
      if (cause?.code === FIGHT_UNAVAILABLE) return false;
      notify('error', cause?.message || 'Could not update that creature.');
      refreshVisibleTokens();
      return true;
    }
  }, [notify, refreshVisibleTokens]);

  // A character's conditions live on their sheet, which is what the encounter
  // builder and the sheet view both read. Writing them onto the token row would
  // create a second copy that the next sheet update silently overwrites.
  const writeConditions = useCallback(async (token, conditions) => {
    if (token.characterId) {
      await characterHealth(token.characterId, tokenHealthCommand(token, { activeConditions: conditions }));
      return;
    }
    await setTokenConditions(token.id, conditions);
  }, [characterHealth]);

  const handleMarkToken = useCallback(async (token, {
    conditions, showHp, effects, hpCurrent, deathSaves, healthPatch = {},
  }) => {
    // On a piece of their own, a player may also decide whether it wears a hit
    // point bar — that is an ordinary update the row policy already allows.
    const owned = canMove(token);
    setTokens((current) => current.map((item) => (
      item.id === token.id
        ? {
          ...item,
          conditions,
          effects,
          ...(owned ? { showHp, ...(token.characterId ? {} : { hpCurrent, deathSaves }) } : {}),
        }
        : item
    )));
    try {
      if (token.characterId && owned) {
        if (Object.keys(healthPatch).length) await characterHealth(token.characterId, tokenHealthCommand(token, healthPatch));
      } else {
        await writeConditions(token, conditions);
      }
      // Both marks go through their own function, which writes one column and
      // checks the table rather than the row: noting that the ogre is under
      // Bane is not the same as being handed the ogre.
      // On a piece linked to a cloud fight both marks are forwarded to its
      // combatant by the database. A character's effects are on its sheet and
      // went with the health command above.
      if (!token.characterId) await setTokenEffects(token.id, effects);
      if (owned) await updateToken(token.id, { show_hp: showHp });
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not mark that token.');
    }
  }, [canMove, characterHealth, notify, writeConditions]);

  const handleSaveToken = useCallback(async (token, {
    label, gmOnly, conditions, hpCurrent, hpMax, showHp, effects, deathSaves, healthPatch = {},
  }) => {
    const publicLabel = gmOnly ? '' : label;
    const secret = gmOnly ? label : '';
    // No piece writes hit points to its public row: a character's belong to the
    // sheet, a linked enemy's to its fight, any other piece's to the GM-only
    // secrets. Whether the bar is shown is the piece's own business.
    setTokens((current) => current.map((item) => (
      item.id === token.id
        ? {
          ...item,
          label: publicLabel,
          secretLabel: secret,
          conditions,
          effects,
          showHp,
          ...(token.characterId ? {} : { hpCurrent, deathSaves, hpMax }),
        }
        : item
    )));
    try {
      // Vitals take the route that suits the piece: a character's go to the
      // sheet, a cloud fight's enemy to its combatant, anything else to its row.
      const linked = await commitLinkedMonster(token, { hpCurrent, hpMax, conditions, effects });
      if (token.characterId) {
        if (Object.keys(healthPatch).length) await characterHealth(token.characterId, tokenHealthCommand(token, healthPatch));
      } else if (!linked) {
        await writeConditions(token, conditions);
        // `token` carries the GM's real values (overlaid), so an unchanged
        // edit writes nothing.
        if (hpCurrent !== (token.hpCurrent ?? null) || hpMax !== (token.hpMax ?? null)) {
          await setTokenHp(token.id, { hpCurrent, hpMax });
          gmVitals.setLocal(token.id, { hpCurrent, hpMax });
        }
      }
      // A character's effects are on its sheet (the health command above), a
      // linked enemy's in its fight; only any other piece keeps them on its row.
      await updateToken(token.id, {
        label: publicLabel,
        show_hp: showHp,
        ...(linked || token.characterId ? {} : { effects }),
      });
      if (secret !== (token.secretLabel || '')) await setTokenSecret(token.id, secret);
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not update that token.');
    }
  }, [characterHealth, commitLinkedMonster, gmVitals, notify, writeConditions]);

  const handleTokenVitals = useTokenVitalCommands({
    gmVitals, characterHealth, writeConditions, setTokens, notify, refreshVisibleTokens,
  });

  const handleDeathSaveChange = useCallback((token, type, value) => {
    if (!token?.characterId || !['success', 'fail'].includes(type)) return;
    const deathSaves = { ...normalizeDeathSaves(token.deathSaves), [type]: clampDeathSaveCount(value) };
    const conditions = setConditionActive(
      token.conditions || [],
      DEAD_CONDITION_KEY,
      deathSaves.fail >= 3,
    );
    const patch = {
      label: token.secretLabel || token.label || '',
      gmOnly: Boolean(token.secretLabel),
      conditions,
      hpCurrent: 0,
      hpMax: token.hpMax,
      showHp: token.showHp,
      effects: token.effects || [],
      deathSaves,
      healthPatch: { deathSaves, activeConditions: conditions },
    };
    if (role.isGm) handleSaveToken(token, patch);
    else handleMarkToken(token, patch);
  }, [handleMarkToken, handleSaveToken, role.isGm]);

  const handleDeleteToken = useCallback(async (token) => {
    setBusy(true);
    try {
      const { cleanupError } = await deleteToken(token.id, token.imagePath);
      setTokens((current) => current.filter((item) => item.id !== token.id));
      if (cleanupError) {
        notify('warning', 'The piece was removed, but its uploaded image could not be cleaned up.');
      }
    } catch (cause) {
      notify('error', cause?.message || 'Could not remove that token.');
    } finally {
      setBusy(false);
    }
  }, [notify]);

  const handleDeleteTokens = useCallback(async (selected) => {
    const pieces = (selected || []).filter((token) => token?.id && canMove(token));
    if (!pieces.length) return false;

    setBusy(true);
    let allRemoved = false;
    try {
      const results = await Promise.allSettled(
        pieces.map((token) => deleteToken(token.id, token.imagePath)),
      );
      const removedIds = new Set(results.flatMap((result, index) => (
        result.status === 'fulfilled' ? [pieces[index].id] : []
      )));
      setTokens((current) => current.filter((token) => !removedIds.has(token.id)));

      const cleanupFailures = results.filter((result) => (
        result.status === 'fulfilled' && result.value.cleanupError
      )).length;
      const deleteFailures = results.length - removedIds.size;
      allRemoved = deleteFailures === 0;
      if (cleanupFailures) notify('warning', 'The pieces were removed, but some uploaded images could not be cleaned up.');
      if (deleteFailures) notify('error', `${deleteFailures} selected piece${deleteFailures === 1 ? '' : 's'} could not be removed.`);
    } finally {
      setBusy(false);
    }
    return allRemoved;
  }, [canMove, notify]);

  const handleRemoveCharacter = useCallback((entry) => {
    const token = tokens.find((item) => item.characterId === entry.characterId);
    if (token) handleDeleteToken(token);
  }, [handleDeleteToken, tokens]);

  // Only the fog brushes belong to the GM. Listing them, rather than listing
  // what a player may hold, is what stopped the laser and the ruler from being
  // quietly downgraded to 'select' every time a new tool was added.

  return {
    handleMarkToken, handleSaveToken, handleTokenVitals, handleDeathSaveChange,
    handleDeleteToken, handleDeleteTokens, handleRemoveCharacter,
  };
}
