import { useCallback, useMemo, useRef, useState } from 'react';
import { combatantToToken } from '../../../shared/vtt/tokens/encounterImport.js';
import { beginPiecePointerDrag } from '../tokens/PiecePreview.jsx';
import { FIGHT_UNAVAILABLE, commitFightTurn } from '../../../shared/cloud/api/encounterFights.js';
import { makeSourceRef } from '../../../shared/vtt/tokens/encounterSync.js';
import {
  sceneFightChoices,
  showsFight,
  turnBase,
  turnEntriesFromFight,
  turnEntriesFromTokens,
} from '../../../shared/vtt/tokens/initiative.js';
import { previewToken } from '../../../shared/vtt/tokens/placement.js';
import { findMonster } from '../../../shared/bestiary/monsterUtils.js';

// The initiative strip and creature stat blocks on the map. The GM reads the
// shown fight row and sees every combatant; everyone else (player preview and
// projector included) sees the order carried by the pieces they can see. Only
// the GM steps the turn (commit_fight_turn) or picks which fight is shown.
export function useSceneInitiative({
  role, spectator, gmPlayerPreview, sceneTurns, gmVitals, monsterDb, notify, activeLayer,
  visibleTokens, projectedTokens, contentView, setContentView, floatingSheetOpen,
  setFloatingSheetOpen, mapFullscreen, setPlacementDrag, handleCreatureRoll,
}) {
  // Initiative. The GM reads the shown fight itself and sees every combatant;
  // everyone else — the player preview and the projector included — sees the
  // turn order the pieces they can see carry, so a hidden creature's turn
  // passes without a name.
  const gmTurnView = role.isGm && !spectator && !gmPlayerPreview;
  const shownTurns = sceneTurns.turns;
  const shownFightRow = gmTurnView && showsFight(shownTurns) ? gmVitals.fights[String(shownTurns.fightId)] || null : null;
  const initiativeEntries = useMemo(() => (
    shownFightRow
      ? turnEntriesFromFight(shownFightRow, visibleTokens, shownTurns)
      : turnEntriesFromTokens(gmTurnView ? visibleTokens : projectedTokens)
  ), [gmTurnView, projectedTokens, shownFightRow, shownTurns, visibleTokens]);
  const initiativeRound = shownFightRow ? turnBase(shownFightRow.fight).round : shownTurns?.round ?? null;
  const initiativeChoices = useMemo(
    () => (gmTurnView ? sceneFightChoices(visibleTokens, gmVitals.fights) : []),
    [gmTurnView, gmVitals.fights, visibleTokens],
  );
  const [turnBusy, setTurnBusy] = useState(false);
  const turnBusyRef = useRef(false);
  const handleTurnStep = useCallback(async (direction) => {
    if (!showsFight(shownTurns) || turnBusyRef.current) return;
    turnBusyRef.current = true;
    setTurnBusy(true);
    try {
      const held = gmVitals.fights[String(shownTurns.fightId)];
      const { applied, row } = await commitFightTurn(shownTurns.fightId, held ? turnBase(held.fight) : null, direction);
      if (row) gmVitals.acceptFight(row);
      // Moved meanwhile (the builder, another screen): what is shown now is
      // where the turn really is; the next press moves on from there.
      if (!applied) notify('info', 'The turn had already moved — showing where it is now.');
    } catch (cause) {
      notify('error', cause?.code === FIGHT_UNAVAILABLE
        ? 'That fight is no longer available.'
        : cause?.message || 'Could not change the turn.');
    } finally {
      turnBusyRef.current = false;
      setTurnBusy(false);
    }
  }, [gmVitals, notify, shownTurns]);
  const handleChooseFight = useCallback(async (choice) => {
    try {
      await sceneTurns.choose(choice ? { instanceId: choice.instanceId, fightId: choice.fightId } : null);
    } catch (cause) {
      notify('error', cause?.message || 'Could not change the fight shown.');
    }
  }, [notify, sceneTurns]);
  // A creature's stat block, for the GM: a monster of a cloud fight, whose
  // combatant names the monster and carries the conditions its d20 tests roll
  // with. Opened by clicking its piece or its initiative entry, or from the
  // piece's menu; it need not be on the board at all.
  //
  // It is shown where the character sheets are — the side column, or the
  // floating sheet in fullscreen — in place of the character, without becoming
  // one of the sheet selector's choices (user decision 2026-10-26): picking a
  // character there puts the character back.
  const [statBlockRef, setStatBlockRef] = useState(null);
  // Whether the sheet area was opened for the stat block, and so closes with it.
  const statBlockOpenedAreaRef = useRef(false);
  const combatantFor = useCallback((ref) => {
    const row = ref ? gmVitals.fights[String(ref.fightId)] : null;
    if (!row || String(row.instance_id) !== String(ref.instanceId)) return null;
    return (row.fight?.combatants || []).find((entry) => (
      String(entry?.id) === String(ref.combatantId) && entry.type !== 'player'
    )) || null;
  }, [gmVitals.fights]);
  const monsterFor = useCallback((combatant) => {
    const wanted = combatant?.monsterRef;
    return wanted ? findMonster(monsterDb.monsters, wanted, { strictSource: true }) : null;
  }, [monsterDb.monsters]);
  const statBlockFor = useCallback((ref) => {
    const combatant = combatantFor(ref);
    const monster = monsterFor(combatant);
    return monster ? { monster, combatant, ref } : null;
  }, [combatantFor, monsterFor]);
  const sheetAreaOpen = mapFullscreen ? floatingSheetOpen : contentView === 'sheet';
  const openStatBlock = useCallback((ref) => {
    if (!gmTurnView || !statBlockFor(ref)) return;
    // Another creature clicked while one is on show keeps the answer of the
    // first: the area goes back to whatever it was before either.
    if (!(sheetAreaOpen && statBlockRef)) statBlockOpenedAreaRef.current = !sheetAreaOpen;
    setStatBlockRef(ref);
    if (mapFullscreen) setFloatingSheetOpen(true);
    else setContentView('sheet');
  }, [gmTurnView, mapFullscreen, sheetAreaOpen, statBlockFor, statBlockRef]);
  const closeStatBlock = useCallback(() => {
    setStatBlockRef(null);
    if (statBlockOpenedAreaRef.current) {
      setContentView('map');
      setFloatingSheetOpen(false);
    }
    statBlockOpenedAreaRef.current = false;
  }, []);
  const statBlock = gmTurnView && statBlockRef ? statBlockFor(statBlockRef) : null;
  const handleStatBlockRoll = useCallback((roll) => {
    if (!statBlock) return;
    const { combatant, ref } = statBlock;
    handleCreatureRoll({
      ...roll,
      actor: {
        actorName: combatant.name,
        actorColor: combatant.shapeClr || combatant.color || null,
        actorShape: combatant.shape || null,
        actorLabel: combatant.label || '',
        sourceRef: makeSourceRef(ref.instanceId, ref.fightId, ref.combatantId),
      },
    });
  }, [handleCreatureRoll, statBlock]);

  // The GM's entries: clicking a creature opens its block; one added to the
  // fight since (in the builder) and not on the board yet is dragged from the
  // strip straight onto it, as from the encounter import.
  const turnRefFor = useCallback((entry) => (
    showsFight(shownTurns) && entry?.combatantId != null && !entry.player
      ? { instanceId: shownTurns.instanceId, fightId: shownTurns.fightId, combatantId: String(entry.combatantId) }
      : null
  ), [shownTurns]);
  const gmInitiativeEntries = useMemo(() => (
    gmTurnView && shownFightRow
      ? initiativeEntries.map((entry) => ({
        ...entry,
        placeable: !entry.onBoard && !entry.dead && !entry.player && entry.combatantId != null,
      }))
      : initiativeEntries
  ), [gmTurnView, initiativeEntries, shownFightRow]);
  const handleEntryClick = useCallback((entry) => {
    const ref = turnRefFor(entry);
    if (ref) openStatBlock(ref);
  }, [openStatBlock, turnRefFor]);
  const handleEntryPointerDown = useCallback((entry, event) => {
    const ref = turnRefFor(entry);
    const combatant = combatantFor(ref);
    if (!combatant) return;
    // The fight row keeps the monster as a reference; its size comes from the
    // stat block.
    const hydrated = { ...combatant, monsterData: monsterFor(combatant) };
    const layer = activeLayer === 'gm' ? 'gm' : 'tokens';
    beginPiecePointerDrag(event, {
      kind: 'encounter',
      combatants: [hydrated],
      layer,
      instanceId: ref.instanceId,
      fightId: ref.fightId,
      token: previewToken(combatantToToken(hydrated, { layer, instanceId: ref.instanceId, fightId: ref.fightId })),
      count: 1,
    }, {
      onPlacementDragStart: setPlacementDrag,
      onPlacementDragEnd: () => setPlacementDrag(null),
    });
  }, [activeLayer, combatantFor, monsterFor, turnRefFor]);

  return {
    gmTurnView, shownTurns, initiativeEntries, initiativeRound, initiativeChoices, turnBusy,
    handleTurnStep, handleChooseFight, statBlockRef, setStatBlockRef,
    statBlockOpenedAreaRef, statBlockFor, openStatBlock, closeStatBlock, statBlock,
    handleStatBlockRoll, gmInitiativeEntries, handleEntryClick, handleEntryPointerDown,
  };
}
