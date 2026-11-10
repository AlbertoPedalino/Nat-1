import { useCallback } from 'react';
import { tokenHealthCommand } from '../../../shared/vtt/tokens/characterHealth.js';
import {
  deleteToken,
  setTokenConditions,
  setTokenEffects,
  setTokenHp,
  setTokenSecret,
  updateToken,
} from '../../../shared/cloud/api/vttTokens.js';
import { useTokenVitalCommands } from './useTokenVitalCommands.js';
import { withDeathSave } from '../../../shared/character/combat/mortality.js';
import { failureMessage, runBusy } from '../../../shared/ui/busyAction.js';
import { patchById, replaceById } from '../../../shared/vtt/session/liveScene.js';

// Changing pieces already on the scene: conditions, reminders, HP and the rest
// of the token menu, death saves, visibility, deletion. A character's vitals go
// to its sheet (health commands); an imported monster's go to its fight row
// (commit_fight_combatant_vitals); a loose piece's to its map_tokens row.
export function useTokenEdits({
  role, notify, tokens, setTokens, canMove, characterHealth, gmVitals, refreshVisibleTokens,
  setBusy,
}) {
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

  const { handleTokenVitals, commitCreatureEdit } = useTokenVitalCommands({
    gmVitals, characterHealth, writeConditions, setTokens, notify, refreshVisibleTokens,
  });

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
      setTokens((current) => replaceById(current, token));
      notify('error', failureMessage('Could not mark that token.', cause));
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
    setTokens((current) => patchById(current, token.id, {
      label: publicLabel,
      secretLabel: secret,
      conditions,
      effects,
      showHp,
      ...(token.characterId ? {} : { hpCurrent, deathSaves, hpMax }),
    }));
    try {
      // Vitals take the route that suits the piece: a character's go to the
      // sheet, a cloud fight's enemy to its combatant, anything else to its row.
      const linked = await commitCreatureEdit(token, creatureEdit(healthPatch, { hpCurrent, conditions, effects }));
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
      setTokens((current) => replaceById(current, token));
      notify('error', failureMessage('Could not update that token.', cause));
    }
  }, [characterHealth, commitCreatureEdit, gmVitals, notify, writeConditions]);

  const handleDeathSaveChange = useCallback((token, type, value) => {
    if (!token?.characterId || !['success', 'fail'].includes(type)) return;
    // A character marking death saves is at 0 HP.
    const { deathSaves, conditions } = withDeathSave(
      { hp: 0, deathSaves: token.deathSaves, conditions: token.conditions || [] },
      type,
      value,
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
    return runBusy({ setBusy, notify }, async () => {
      const { cleanupError } = await deleteToken(token.id, token.imagePath);
      setTokens((current) => current.filter((item) => item.id !== token.id));
      if (cleanupError) {
        notify('warning', 'The piece was removed, but its uploaded image could not be cleaned up.');
      }
    }, 'Could not remove that token.');
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

// What the GM changed in a creature's menu: the fields the control touched
// (`healthPatch`, as for a character), applied to the creature as its fight
// has it now — the menu's other values were loaded when it opened and may be
// stale. A blank HP clears nothing on a creature. The maximum goes as a health
// command of its own.
function creatureEdit(healthPatch, { hpCurrent, conditions, effects }) {
  return {
    ...(Object.hasOwn(healthPatch, 'currentHP') && hpCurrent != null ? { hpCurrent } : {}),
    ...(Object.hasOwn(healthPatch, 'activeConditions') ? { conditions } : {}),
    ...(Object.hasOwn(healthPatch, 'activeEffects') ? { effects } : {}),
  };
}
