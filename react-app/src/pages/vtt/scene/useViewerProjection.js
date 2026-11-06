import { useMemo } from 'react';
import { withSheetVitals } from '../../../shared/campaign/roster.js';
import { usePortraits } from '../../../shared/character/profile/usePortraits.js';
import { resolveTokens } from '../../../shared/vtt/session/liveScene.js';
import { projectPlayerTokens } from '../../../shared/vtt/session/spectator.js';
import { fade } from './sceneEditorStyles.js';

// What this viewer may see of the board. The GM gets everything, with the
// layers they are not editing faded; a projector and the GM's player preview
// still have GM database permissions, so the player boundary is recreated here
// for pieces, marks, roll bubbles, dice and hexcrawl cells.
export function useViewerProjection({
  spectator,
  gmPlayerPreview,
  role,
  activeLayer,
  drawings,
  tokens,
  ghosts,
  draggingRef,
  gmVitals,
  roster,
  tokenImageUrls,
  playArea,
  rollBubbles,
  diceThrows,
  hexcrawl,
}) {
  // While editing one layer, strokes on the others fade back rather than
  // disappear: they are context, and losing them would make the map unreadable
  // the moment you switch tools.
  const visibleDrawings = useMemo(() => (
    spectator || gmPlayerPreview
      ? drawings.filter((drawing) => drawing.layer !== 'gm' && !drawing.hiddenFromPlayers)
      : role.isGm
      ? drawings.map((drawing) => (
        drawing.layer === activeLayer ? drawing : { ...drawing, color: fade(drawing.color) }
      ))
      : drawings
  ), [activeLayer, drawings, gmPlayerPreview, role.isGm, spectator]);

  // The party's faces. Held by the browser after the first load, so a scene with
  // six characters in it does not go back to the bucket on every visit.
  const portraits = usePortraits(useMemo(
    () => roster.map((entry) => entry.portraitPath),
    [roster],
  ));

  const visibleTokens = useMemo(
    // Sheet hit points are overlaid at render, never copied onto the row: the
    // character sheet stays the one place a character's HP lives.
    // The GM's real enemy HP are overlaid the same way, except in player view.
    () => withSheetVitals(
      (gmPlayerPreview ? (list) => list : gmVitals.overlay)(resolveTokens(tokens, ghosts, draggingRef.current)),
      roster,
    )
      .map((token) => {
        // A monster's artwork is a file on the scene; a character's is their
        // portrait, which belongs to the sheet and follows it everywhere.
        const url = (token.portraitPath && portraits[token.portraitPath])
          || (token.imagePath && tokenImageUrls[token.imagePath])
          || null;
        return url ? { ...token, imageUrl: url } : token;
      }),
    [ghosts, gmPlayerPreview, gmVitals.overlay, portraits, roster, tokenImageUrls, tokens],
  );

  // A projector and the inline preview still have GM database permissions.
  // Recreate the player boundary explicitly before anything reaches their
  // viewport: no hidden layer, staging area, or secret label.
  const projectedTokens = useMemo(() => {
    if (!spectator && !gmPlayerPreview) return visibleTokens;
    return projectPlayerTokens(visibleTokens, playArea);
  }, [gmPlayerPreview, playArea, spectator, visibleTokens]);

  const projectedTokenById = useMemo(
    () => new Map(projectedTokens.map((token) => [token.id, token])),
    [projectedTokens],
  );

  const projectedRollBubbles = useMemo(() => (
    spectator || gmPlayerPreview
      ? rollBubbles
        .map((entry) => ({ ...entry, token: projectedTokenById.get(entry.token?.id) || null }))
        .filter((entry) => entry.token)
      : rollBubbles
  ), [gmPlayerPreview, projectedTokenById, rollBubbles, spectator]);
  const projectedDiceThrows = useMemo(() => (
    spectator || gmPlayerPreview
      ? diceThrows.map((entry) => ({
        ...entry,
        token: entry.token ? (projectedTokenById.get(entry.token.id) || null) : null,
      }))
      : diceThrows
  ), [diceThrows, gmPlayerPreview, projectedTokenById, spectator]);

  // The GM's hexcrawl hook contains their unrevealed planning cells. The
  // projector normally gets an RLS-filtered list; the inline preview needs to
  // reproduce that boundary locally because it keeps using the GM session.
  const projectedHexCells = useMemo(() => {
    if (!hexcrawl.visible) return null;
    if (!spectator && !gmPlayerPreview) return hexcrawl.cellsByKey;
    return new Map(
      [...hexcrawl.cellsByKey.entries()].filter(([, cell]) => cell?.revealed),
    );
  }, [gmPlayerPreview, hexcrawl.cellsByKey, hexcrawl.visible, spectator]);

  return {
    visibleDrawings,
    visibleTokens,
    projectedTokens,
    projectedRollBubbles,
    projectedDiceThrows,
    projectedHexCells,
  };
}
