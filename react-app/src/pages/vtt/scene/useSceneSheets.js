import {
  useCallback, useEffect, useMemo, useState, useTransition,
} from 'react';
import { parseSourceRef } from '../../../shared/vtt/tokens/encounterSync.js';
import { sheetChoicesForRole } from '../../../shared/vtt/sheets/sheetView.js';
import {
  DEFAULT_SHEET_SPLIT,
  readSheetSplit,
  writeSheetSplit,
} from '../../../shared/vtt/sheets/sheetLayout.js';

// How much of the row the side sheet takes beside the board, remembered per
// account.
export function useSheetSplit(userId) {
  const [sheetSplit, setSheetSplit] = useState(DEFAULT_SHEET_SPLIT);
  const sheetSplitStorageKey = `gb:vtt:sheet-split:${userId || 'local'}`;

  useEffect(() => {
    setSheetSplit(readSheetSplit(sheetSplitStorageKey));
  }, [sheetSplitStorageKey]);

  const commitSheetSplit = useCallback((value) => {
    setSheetSplit(writeSheetSplit(sheetSplitStorageKey, value));
  }, [sheetSplitStorageKey]);

  return { sheetSplit, commitSheetSplit };
}

// What the sheet area shows — a character's sheet or a creature's stat block —
// and the ways to open it: picking a character, or the GM clicking a piece.
// The stat block itself is useSceneInitiative's; the floating sheet's open
// state is the editor's, because initiative opens it too.
export function useSheetSelection({
  roster,
  role,
  statBlock,
  statBlockRef,
  setStatBlockRef,
  statBlockOpenedAreaRef,
  openStatBlock,
  contentView,
  setContentView,
  mapFullscreen,
  gmPlayerPreview,
  setFloatingSheetOpen,
}) {
  const [sheetCharacterId, setSheetCharacterId] = useState(null);
  const [, startSheetTransition] = useTransition();

  const sheetChoices = useMemo(
    () => sheetChoicesForRole(roster, {
      isGm: role.isGm,
      ownedCharacterIds: role.ownedCharacterIds,
    }),
    [role.isGm, role.ownedCharacterIds, roster],
  );

  useEffect(() => {
    if (!sheetChoices.length) {
      setSheetCharacterId(null);
      // A GM without characters still reads a creature's stat block there.
      if (!statBlockRef) setContentView('map');
      return;
    }
    if (!sheetChoices.some((entry) => entry.characterId === sheetCharacterId)) {
      setSheetCharacterId(sheetChoices[0].characterId);
    }
  }, [sheetCharacterId, sheetChoices, statBlockRef]);

  // In fullscreen the viewport is the only subtree the browser paints. The
  // same sheet therefore moves into its draggable viewport window instead of
  // remaining mounted a second time in the hidden side column.
  const showsStatBlock = Boolean(statBlock);
  // No character is picked while a stat block is on show.
  const sheetAreaSelectedId = showsStatBlock ? null : sheetCharacterId;
  const hasSheetContent = sheetChoices.length > 0 || showsStatBlock;
  const sideSheetOpen = contentView === 'sheet' && !mapFullscreen && !gmPlayerPreview && hasSheetContent;
  const selectSheetCharacter = useCallback((characterId) => {
    // Picked a character: the area is the user's now, and stays open.
    setStatBlockRef(null);
    statBlockOpenedAreaRef.current = false;
    startSheetTransition(() => setSheetCharacterId(characterId));
  }, []);
  // The GM's click on a piece: a character's opens their sheet beside the
  // board, a creature's its stat block (user decision 2026-10-26: GM only — a
  // player has the Sheet button for their own).
  const openCharacterSheet = useCallback((characterId) => {
    if (!sheetChoices.some((entry) => entry.characterId === characterId)) return;
    selectSheetCharacter(characterId);
    if (mapFullscreen) setFloatingSheetOpen(true);
    else setContentView('sheet');
  }, [mapFullscreen, selectSheetCharacter, sheetChoices]);
  const handleTokenClick = useCallback((token) => {
    if (token?.characterId) {
      openCharacterSheet(token.characterId);
      return;
    }
    const ref = parseSourceRef(token?.sourceRef);
    if (ref) openStatBlock(ref);
  }, [openCharacterSheet, openStatBlock]);

  return {
    sheetChoices,
    sheetCharacterId,
    showsStatBlock,
    sheetAreaSelectedId,
    hasSheetContent,
    sideSheetOpen,
    selectSheetCharacter,
    openCharacterSheet,
    handleTokenClick,
  };
}
