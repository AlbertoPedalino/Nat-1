import { useCallback, useRef } from 'react';
import { createToken, setTokenSecret } from '../../../shared/cloud/api/vttTokens.js';
import { deleteMapImage, uploadMapImage } from '../../../shared/cloud/api/vttMapImages.js';
import {
  combatantToToken,
  layoutTokens,
  monsterGroupTokens,
} from '../../../shared/vtt/tokens/encounterImport.js';
import { placeAroundCenter } from '../../../shared/vtt/tokens/placement.js';
import { isTokenInPlay } from '../../../shared/vtt/scene/scene.js';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { launchLibraryEncounter } from '../../encounterbuilder/sync/handoff.js';
import {
  deleteInstanceFight,
  saveInstanceFight,
} from '../../../shared/cloud/api/encounterFights.js';
import { addById } from '../../../shared/vtt/session/liveScene.js';

// Putting pieces on the scene: markers, uploaded images, campaign characters,
// monsters, map objects and a whole encounter from the library, by click (in
// rings around the view centre) or by drag and drop at a cell.
// A picture arrives at its own shape rather than as a square: a banner dropped
// as 4x4 has to be un-squashed by hand every single time, and the corner handle
// then keeps whatever ratio it landed with. Four cells on the long side is about
// a rug — big enough to see, small enough not to bury the map.
async function imageSpan(file, longSide = 4) {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close?.();
    if (!width || !height) return { w: longSide, h: longSide };
    const scale = longSide / Math.max(width, height);
    return {
      w: Math.max(0.5, Math.round(width * scale * 10) / 10),
      h: Math.max(0.5, Math.round(height * scale * 10) / 10),
    };
  } catch {
    // A browser without createImageBitmap, or a file it cannot decode: the
    // upload still goes through and the GM sizes it themselves.
    return { w: longSide, h: longSide };
  }
}

export function useTokenPlacement({
  scene, role, notify, activeLayer, tokens, setTokens, roster, monsterDb, dungeon, setBusy,
  setImportOpen, setPlacementDrag, shownImageForViewport,
}) {
  const addToken = useCallback(async (token) => {
    setBusy(true);
    try {
      const created = await createToken(scene.id, token);
      setTokens((current) => addById(current, created));
      return created;
    } catch (cause) {
      notify('error', cause?.message || 'Could not add that token.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [notify, scene.id]);

  const canPlacePiece = useCallback(() => {
    if (shownImageForViewport !== 'background') return true;
    notify('warning', 'Switch to the battlemap before placing or moving pieces.');
    return false;
  }, [notify, shownImageForViewport]);

  // Pieces placed with a click land around the middle of the placer's own view,
  // square or hex, so they see where they went. A player's must stay inside the
  // play area they are allowed to receive: a row outside it would be hidden by
  // RLS from the player who just created it. The GM may place anywhere.
  const viewCenterRef = useRef(null);
  const placeInView = useCallback((pieces) => {
    const center = viewCenterRef.current?.();
    if (!center) return null;
    const accept = role.isGm ? undefined : (position) => isTokenInPlay(position, scene.playArea);
    return placeAroundCenter(pieces, tokens, center, { grid: scene.grid, accept });
  }, [role.isGm, scene.grid, scene.playArea, tokens]);

  const nextFreeCell = useCallback(() => {
    const [inView] = placeInView([{}]) || [];
    if (inView) return { x: inView.x, y: inView.y };
    const taken = new Set(tokens.map((token) => `${Math.round(token.x)}:${Math.round(token.y)}`));
    // No view to centre on: the first free cell of the play area, never
    // absolute 0,0, for the same reason as above.
    const startX = scene.playArea?.x || 0;
    const startY = scene.playArea?.y || 0;
    const cols = Math.min(20, scene.playArea?.w || 20);
    const rows = Math.min(20, scene.playArea?.h || 20);
    for (let row = startY; row < startY + rows; row += 1) {
      for (let col = startX; col < startX + cols; col += 1) {
        if (!taken.has(`${col}:${row}`)) return { x: col, y: row };
      }
    }
    return { x: startX, y: startY };
  }, [placeInView, scene.playArea, tokens]);

  // An extra picture is a piece, not a third slot: it can be moved, resized and
  // removed like everything else. It lands on the layer being edited — scenery
  // on the map layer, a handout among the tokens, something the party must not
  // see yet on the GM layer.
  const handleAddImage = useCallback(async (file) => {
    setBusy(true);
    let uploadedPath = null;
    try {
      const span = await imageSpan(file);
      uploadedPath = await uploadMapImage(scene.campaignId, scene.id, file);
      const created = await createToken(scene.id, {
        ...nextFreeCell(),
        layer: activeLayer,
        ...span,
        label: '',
        image_path: uploadedPath,
      });
      setTokens((current) => addById(current, created));
    } catch (cause) {
      if (uploadedPath) {
        try { await deleteMapImage(uploadedPath); } catch {}
      }
      notify('error', cause?.message || 'Could not add that image.');
    } finally {
      setBusy(false);
    }
  }, [activeLayer, nextFreeCell, notify, scene.campaignId, scene.id]);

  const characterToken = useCallback((entry, position) => ({
    ...position,
    // A party piece is always a piece the party can see, whatever layer the GM
    // happens to be editing.
    layer: 'tokens',
    characterId: entry.characterId,
    label: entry.name,
    color: entry.color,
    className: entry.className,
    deathSaves: entry.deathSaves,
  }), []);

  const handlePlaceCharacter = useCallback((entry) => {
    if (!canPlacePiece()) return;
    if (tokens.some((token) => token.characterId === entry.characterId)) return;
    addToken(characterToken(entry, nextFreeCell()));
  }, [addToken, canPlacePiece, characterToken, nextFreeCell, tokens]);

  const handleDropCharacter = useCallback((characterId, position) => {
    if (!canPlacePiece()) return;
    const entry = roster.find((item) => item.characterId === characterId);
    if (!entry) return;
    if (tokens.some((token) => token.characterId === characterId)) return;
    addToken(characterToken(entry, position));
  }, [addToken, canPlacePiece, characterToken, roster, tokens]);

  // Same placement path as an encounter import, minus the fight: a creature
  // dropped on the map has nothing to stay in step with.
  const handlePlaceMonster = useCallback(async (monster, count, { layer, position } = {}) => {
    if (!canPlacePiece()) return;
    setBusy(true);
    try {
      const pieces = monsterGroupTokens(monster, count, { layer });
      const laid = (!position && placeInView(pieces))
        || layoutTokens(pieces, tokens, position ? { origin: position } : undefined);
      for (const token of laid) {
        // eslint-disable-next-line no-await-in-loop
        const created = await createToken(scene.id, token);
        setTokens((current) => addById(current, created));
      }
    } catch (cause) {
      notify('error', cause?.message || 'Could not place that creature.');
    } finally {
      setBusy(false);
    }
  }, [canPlacePiece, notify, placeInView, scene.id, tokens]);

  const handleAddToken = useCallback(async (draft = {}, position) => {
    if (!canPlacePiece()) return;
    const layer = draft.layer || activeLayer;
    let uploadedPath = null;
    setBusy(true);
    try {
      if (draft.imageFile) {
        uploadedPath = await uploadMapImage(scene.campaignId, scene.id, draft.imageFile);
      }
      const created = await createToken(scene.id, {
        ...(position || nextFreeCell()),
        layer,
        label: String(draft.label || '').trim() || (layer === 'gm' ? 'Hidden' : 'Token'),
        color: draft.color || null,
        image_path: uploadedPath,
      });
      setTokens((current) => addById(current, created));
    } catch (cause) {
      if (uploadedPath) {
        try { await deleteMapImage(uploadedPath); } catch {}
      }
      notify('error', cause?.message || 'Could not add that token.');
    } finally {
      setBusy(false);
    }
  }, [activeLayer, canPlacePiece, nextFreeCell, notify, scene.campaignId, scene.id, setTokens]);

  const handlePlaceObject = useCallback(async (object, position) => {
    if (!object?.key) return;
    if (!canPlacePiece()) return;
    // A dungeon marker's label is the GM's own note — "Pit · DC 13 · 2d6". It is
    // kept in the secret table rather than on the row, so springing the trap
    // later shows the party an icon and not the numbers they are about to roll
    // against. The GM still reads it on the piece: a secret label replaces the
    // public one for them.
    const secret = object.secretLabel ? String(object.label || '') : '';
    const targetLayer = object.layer || (role.isGm ? activeLayer : 'tokens');
    const created = await addToken({
      ...(position || nextFreeCell()),
      layer: targetLayer,
      hiddenFromPlayers: targetLayer === 'gm',
      label: secret ? '' : object.label,
      color: object.color || VTT_COLORS.gold,
      iconKey: object.key,
      iconStrokeWidth: object.strokeWidth,
      rotation: 0,
      w: 1,
      h: 1,
    });
    if (!created || !secret) return;
    try {
      await setTokenSecret(created.id, secret);
      setTokens((current) => current.map((item) => (
        item.id === created.id ? { ...item, secretLabel: secret } : item
      )));
    } catch (cause) {
      notify('error', cause?.message || 'The marker was placed, but its note could not be kept secret.');
    }
  }, [activeLayer, addToken, canPlacePiece, nextFreeCell, notify, role.isGm]);

  const handleImportEncounter = useCallback(async (
    combatants, {
      layer, instanceId, fightId, encounterId, roomNumber, roomTitle, position,
    } = {},
  ) => {
    if (!canPlacePiece()) return;
    setBusy(true);
    setImportOpen(false);
    try {
      // A piece with no fight behind it is a picture: nothing is tracking its
      // hit points. Both roads to one end here rather than at a button the GM
      // had to press first — an encounter saved in the builder and never
      // launched, and a dungeon room rolled on this very panel.
      let placed = combatants;
      let ref = fightId;
      let instance = instanceId;
      if (roomNumber != null) {
        const room = await dungeon.sendRoomToBuilder(roomNumber, { title: roomTitle });
        // The panel says why in full — a map with no Encounter Builder linked
        // to it is the usual reason — but a drop that quietly did nothing is
        // the one thing that must not happen.
        if (!room) {
          notify('error', dungeon.linkHint || 'Could not send that room to the Encounter Builder.');
          return;
        }
        placed = room.combatants;
        ref = room.fightId;
        instance = room.instanceId;
      } else if (!ref && encounterId != null) {
        const launched = launchLibraryEncounter(instanceId, encounterId, {
          monsters: monsterDb.monsters,
          roster,
        });
        placed = launched.combatants;
        ref = launched.fightId;
        // The row is what a second screen reads the fight from. Its own attempt,
        // and not a fatal one: the fight is already written in this browser, and
        // the pieces about to land can be run from here whatever the database
        // says.
        if (launched.entry) {
          try {
            await saveInstanceFight(instanceId, launched.entry);
          } catch (cause) {
            notify('warning', `The encounter was launched here, but not online: ${cause?.message || 'the fight could not be saved.'}`);
          }
        }
        // The fight of the encounter's previous version, left behind by a save
        // since: gone here already, and its row goes too so no screen offers it.
        // Best effort — the import dialogs skip a superseded fight regardless.
        (launched.supersededFightIds || []).forEach((fightId) => {
          deleteInstanceFight(fightId).catch(() => {});
        });
      }
      const pieces = placed.map((combatant) => combatantToToken(combatant, {
        layer,
        instanceId: instance,
        fightId: ref,
      }));
      const laid = (!position && placeInView(pieces))
        || layoutTokens(pieces, tokens, position ? { origin: position } : undefined);
      // Sequential rather than parallel: a burst of inserts on one scene is the
      // easiest way to hit a rate limit, and the order they land in is the order
      // the GM sees them appear.
      for (const token of laid) {
        // eslint-disable-next-line no-await-in-loop
        const created = await createToken(scene.id, token);
        setTokens((current) => addById(current, created));
      }
    } catch (cause) {
      notify('error', cause?.message || 'Could not import that encounter.');
    } finally {
      setBusy(false);
    }
  }, [
    canPlacePiece, dungeon.linkHint, dungeon.sendRoomToBuilder, monsterDb.monsters, notify,
    placeInView, roster, scene.id, tokens,
  ]);

  const handleDropPlacement = useCallback((placement, position) => {
    if (!placement) return;
    setPlacementDrag(null);
    if (placement.kind === 'character') {
      handleDropCharacter(placement.characterId, position);
    } else if (placement.kind === 'monster') {
      handlePlaceMonster(placement.monster, placement.count, {
        layer: placement.layer,
        position,
      });
    } else if (placement.kind === 'encounter') {
      handleImportEncounter(placement.combatants, {
        layer: placement.layer,
        instanceId: placement.instanceId,
        fightId: placement.fightId,
        encounterId: placement.encounterId,
        roomNumber: placement.roomNumber,
        roomTitle: placement.roomTitle,
        position,
      });
    } else if (placement.kind === 'token') {
      handleAddToken(placement.token, position);
    } else if (placement.kind === 'object') {
      handlePlaceObject(placement.object, position);
    }
  }, [handleAddToken, handleDropCharacter, handleImportEncounter, handlePlaceMonster, handlePlaceObject]);

  // Label and conditions in one write. A GM-only label goes to its own table:
  // keeping it on the token row would deliver it to the players.
  // A player's only write on a piece that is not theirs. It goes through the
  // RPC, which touches the conditions column and nothing else.
  // An enemy piece imported from a cloud fight: its vitals are written to the
  // combatant in that fight, once, and the piece shows the copy the database
  // derives from it. Answers false when the fight has no cloud row, so the
  // piece keeps its own values as before.

  return {
    viewCenterRef, handleAddImage, handlePlaceCharacter, handleDropCharacter,
    handlePlaceMonster, handleAddToken, handlePlaceObject, handleImportEncounter,
    handleDropPlacement,
  };
}
