import { Box, Typography } from '@mui/material';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import MapObjectGlyph from '../objects/MapObjectGlyph.jsx';
import { initials } from '../../../shared/ui/textCase.js';
import {
  initialsSx,
  classIconSx,
  mapObjectSx,
  turnActiveSx,
  characterPieceSx,
} from './tokenSpriteStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';

// What a piece looks like: its object glyph, artwork, class icon or initials,
// inside the ring that says whose it is.
export default function TokenArt({
  token,
  name,
  isMapObject,
  isScenery,
  isCharacter,
  hasHandles,
  showArtwork,
  hasUploadedArtworkRing,
  ClassIcon,
  dead,
  onArtworkError,
}) {
  // Selection is not drawn at all. What is picked is already obvious from what
  // you just touched, and the menu that opens on it says so plainly; a ring on
  // top of that only competed with the colour that means something.
  const ringWidth = () => {
    // Thick enough to read as the player's colour from across the table, at the
    // size a piece actually is on a zoomed-out board.
    if (isCharacter) return 5;
    if (isMapObject) return 0;
    if (isScenery) return 0;
    if (hasUploadedArtworkRing) return 5;
    return showArtwork ? 0 : 2;
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: isScenery || isMapObject ? 0 : '50%',
        boxSizing: 'border-box',
        // Artwork stands on its own: no disc behind it, which would show
        // through the transparent corners of a bestiary token as a coloured
        // circle. A character keeps a thick ring in their own colour; a
        // creature gets only the thin dark edge that separates it from the
        // map, and none at all once it has its own artwork.
        borderStyle: 'solid',
        borderWidth: ringWidth(),
        borderColor: isCharacter || hasUploadedArtworkRing
          ? (token.color || vttAlpha(VTT_COLORS.black, OPACITY.strong))
          : vttAlpha(VTT_COLORS.black, OPACITY.strong),
        bgcolor: isScenery || isMapObject || showArtwork ? 'transparent' : (token.color || 'secondary.main'),
        outline: token.hiddenFromPlayers || token.layer === 'gm'
          ? `2px dashed ${vttAlpha(VTT_COLORS.accent, OPACITY.solid)}`
          : 'none',
        outlineOffset: '-4px',
        // A character is a cut-out laid on the map (ink outline, solid
        // shadow). Whose turn it is, readable from across the table and on
        // the projector: a gold halo outside the piece's own ring.
        ...(isCharacter ? characterPieceSx : null),
        ...(token.turnActive && !isScenery && !isMapObject ? turnActiveSx : null),
        // A turned piece must not be cut off at the corners of its own box; a
        // creature still needs the clip that crops its art into the circle.
        overflow: hasHandles ? 'visible' : 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: dead ? OPACITY.strong : 1,
        filter: dead ? 'grayscale(0.75)' : 'none',
      }}
    >
      {isMapObject ? (
        <Box sx={{
          ...mapObjectSx,
          color: token.color || VTT_COLORS.accent,
          transform: `rotate(${Number(token.rotation) || 0}deg)`,
        }}>
          <MapObjectGlyph iconKey={token.iconKey} strokeWidth={token.iconStrokeWidth} />
        </Box>
      ) : showArtwork ? (
        <Box
          component="img"
          src={token.imageUrl}
          alt=""
          draggable={false}
          // Art that will not load hands the piece back to its colour and
          // initials, rather than leaving a hole on the board.
          onError={onArtworkError}
          sx={{
            width: '100%',
            height: '100%',
            // Scenery is placed at the size it should cover, so it stretches;
            // a picture dropped on the token layer is scenery too. A
            // creature's art is cropped into its circle instead.
            objectFit: isScenery || hasHandles ? 'fill' : 'cover',
            transform: hasHandles ? `rotate(${Number(token.rotation) || 0}deg)` : 'none',
            pointerEvents: 'none',
          }}
        />
      ) : ClassIcon ? (
        <Box data-class-icon={token.className || 'unknown'} sx={classIconSx}>
          <ClassIcon size="50%" />
        </Box>
      ) : (
        <Typography sx={initialsSx}>{initials(name)}</Typography>
      )}
    </Box>
  );
}
