import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { describeEffect, effectId, effectPolarity } from '../../../shared/character/combatEffects.js';
import { conditionLabel } from '../../../shared/character/conditions.js';

// One piece on the map: the artwork, its name plate underneath, a hit point bar
// and the conditions badge. Kept apart from the viewport because the viewport is
// about coordinates and this is about a creature.
export default function TokenSprite({
  token,
  size,
  dimmed,
  staged,
  interactive,
  movable,
  onPointerDown,
  onContextMenu,
}) {
  const [hovered, setHovered] = useState(false);
  // Bestiary artwork is a circular token on a transparent background, so a
  // coloured disc behind it shows through as a ring in the group's colour. The
  // colour is still the fallback for a piece with no art, or whose art fails to
  // load, so the two are tracked rather than assumed.
  const [artworkFailed, setArtworkFailed] = useState(false);
  useEffect(() => { setArtworkFailed(false); }, [token.imageUrl]);
  const showArtwork = Boolean(token.imageUrl) && !artworkFailed;
  // Scenery is a rectangle: a rug or a door forced into a circle is unusable,
  // and it wants none of the creature furniture either.
  const isScenery = token.layer === 'map';
  // A piece standing for somebody's character, as opposed to a creature the GM
  // put down. Only these wear a colour: the party is who you need to pick out
  // of a crowded board, and giving every goblin a bright ring buries them.
  const isCharacter = Boolean(token.characterId);
  const conditions = token.conditions || [];
  const effects = token.effects || [];
  // One badge for everything the GM has flagged on this creature: two counters
  // side by side would be read as one number anyway.
  const marks = conditions.length + effects.length;
  // Opt-in per piece. A scene where every creature wears a bar is unreadable,
  // and which ones do is a call the GM makes at the table, not a default.
  const hasHp = Boolean(token.showHp) && token.hpMax != null && token.hpMax > 0;
  const current = token.hpCurrent ?? token.hpMax;
  const ratio = hasHp ? Math.max(0, Math.min(1, current / token.hpMax)) : 0;
  const tempRatio = hasHp ? Math.max(0, Math.min(1, (token.tempHp || 0) / token.hpMax)) : 0;
  // The label the GM typed in secret replaces the public one for them only; a
  // player never receives it in the first place.
  const name = token.secretLabel || token.label || '';

  // Selection is not drawn at all. What is picked is already obvious from what
  // you just touched, and the menu that opens on it says so plainly; a ring on
  // top of that only competed with the colour that means something.
  const ringWidth = () => {
    // Thick enough to read as the player's colour from across the table, at the
    // size a piece actually is on a zoomed-out board.
    if (isCharacter) return 5;
    if (isScenery) return 0;
    return showArtwork ? 0 : 2;
  };

  return (
    <Box
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-label={name || 'Token'}
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: size,
        height: size,
        pointerEvents: interactive ? 'auto' : 'none',
        cursor: movable ? 'grab' : 'default',
        opacity: dimmed ? 0.3 : (token.layer === 'gm' || staged ? 0.6 : 1),
        filter: staged ? 'grayscale(0.7)' : 'none',
        // Above its neighbours while hovered so the expanded conditions are not
        // covered by the next piece along.
        zIndex: hovered ? 3 : 1,
        touchAction: 'none',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: isScenery ? 0 : '50%',
          boxSizing: 'border-box',
          // Artwork stands on its own: no disc behind it, which would show
          // through the transparent corners of a bestiary token as a coloured
          // circle. A character keeps a thick ring in their own colour; a
          // creature gets only the thin dark edge that separates it from the
          // map, and none at all once it has its own artwork.
          borderStyle: 'solid',
          borderWidth: ringWidth(),
          borderColor: isCharacter ? (token.color || 'rgba(0,0,0,0.6)') : 'rgba(0,0,0,0.6)',
          bgcolor: isScenery || showArtwork ? 'transparent' : (token.color || 'secondary.main'),
          outline: token.layer === 'gm' ? '2px dashed rgba(232,201,106,0.9)' : 'none',
          outlineOffset: '-4px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showArtwork ? (
          <Box
            component="img"
            src={token.imageUrl}
            alt=""
            draggable={false}
            // Art that will not load hands the piece back to its colour and
            // initials, rather than leaving a hole on the board.
            onError={() => setArtworkFailed(true)}
            sx={{
              width: '100%',
              height: '100%',
              // Scenery is placed at the size it should cover, so it stretches;
              // a creature's art is cropped into its circle.
              objectFit: isScenery ? 'fill' : 'cover',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <Typography sx={initialsSx}>{initials(name)}</Typography>
        )}
      </Box>

      {/* Bars and plate stack under the piece. The numbers ride inside the bar
          rather than beside it: one strip to read instead of two things to
          line up, and it stays legible over any map. */}
      {!isScenery && (hasHp || name) ? (
        <Box sx={stackSx}>
          {/* The whole name, not an abbreviation: two goblins are only told
              apart by their letter. First in the stack, so the eye reads who it
              is before how hurt they are. */}
          {name ? <Box sx={plateSx}>{name}</Box> : null}

          {hasHp ? (
            <Box sx={hpBarSx} title={`${current} / ${token.hpMax}`}>
              <Box sx={{ ...hpFillSx, width: `${ratio * 100}%`, bgcolor: hpColor(ratio) }} />
              <Box component="span" sx={hpTextSx}>{current}/{token.hpMax}</Box>
            </Box>
          ) : null}

          {/* Its own bar, under the real one: temporary hit points sit on top of
              the maximum, so folding them into the same strip would show a
              character healthier than they can be. Scaled against max HP just to
              give the cushion a size — it has no maximum of its own. */}
          {hasHp && token.tempHp > 0 ? (
            <Box sx={tempBarSx} title={`${token.tempHp} temporary hit points`}>
              <Box sx={{ ...tempFillSx, width: `${tempRatio * 100}%` }} />
              <Box component="span" sx={tempTextSx}>+{token.tempHp}</Box>
            </Box>
          ) : null}
        </Box>
      ) : null}

      {marks && !hovered ? <Box sx={badgeSx}>{marks}</Box> : null}

      {/* One pill each, wrapped: a run-on sentence of six states is read as a
          wall, while pills are counted at a glance and colour-coded by kind. */}
      {marks && hovered ? (
        <Box sx={pillsSx}>
          {conditions.map((key) => (
            <Box key={key} sx={{ ...pillSx, ...conditionPillSx }}>{conditionLabel(key)}</Box>
          ))}
          {effects.map((effect) => (
            <Box
              key={effectId(effect)}
              sx={{ ...pillSx, ...(effectPolarity(effect) === 'adv' ? advPillSx : disPillSx) }}
            >
              {describeEffect(effect)}
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function initials(label) {
  return String(label || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

// Green while healthy, amber past half, red when bloodied enough to matter.
function hpColor(ratio) {
  if (ratio > 0.5) return '#4f8a5b';
  if (ratio > 0.25) return '#c8973f';
  return '#b3423a';
}

const initialsSx = {
  fontSize: '0.7rem',
  fontWeight: 800,
  color: 'rgba(0,0,0,0.75)',
  pointerEvents: 'none',
};

// Everything under the piece, in one column so the bars and the plate stay
// centred on it however wide the name is.
const stackSx = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  pointerEvents: 'none',
};

const barBaseSx = {
  position: 'relative',
  // Wide enough for "100/100" without stretching a small token's footprint.
  width: 56,
  borderRadius: 3,
  bgcolor: 'rgba(0,0,0,0.75)',
  border: '1px solid rgba(0,0,0,0.6)',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

const hpBarSx = { ...barBaseSx, height: 13 };

const hpFillSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  transition: 'width 120ms linear',
};

const textBaseSx = {
  position: 'relative',
  fontSize: '0.58rem',
  fontWeight: 700,
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
  // A dark outline keeps the figures readable over both the empty track and a
  // bright fill, without dimming the bar itself.
  textShadow: '0 1px 2px rgba(0,0,0,0.9)',
};

const hpTextSx = { ...textBaseSx, color: '#f3ead6' };

const tempBarSx = { ...barBaseSx, height: 10 };

const tempFillSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  bgcolor: '#4f7fa8',
  transition: 'width 120ms linear',
};

const tempTextSx = { ...textBaseSx, color: '#dff0fb', fontSize: '0.54rem' };

const plateSx = {
  px: 0.6,
  py: '1px',
  borderRadius: 1,
  bgcolor: 'rgba(15,14,13,0.85)',
  color: '#e8dcc0',
  fontSize: '0.62rem',
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
};

// Sticks out past the edge of the disc so it reads as attached to the piece
// rather than drawn on it.
const badgeSx = {
  position: 'absolute',
  top: '-6px',
  right: '-6px',
  minWidth: 16,
  height: 16,
  px: 0.4,
  borderRadius: '8px',
  bgcolor: '#d69245',
  color: '#0f0e0d',
  fontSize: '0.62rem',
  fontWeight: 800,
  lineHeight: '16px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  transition: 'all 120ms ease',
};

// Above the piece and growing upwards, so a long list never covers the creature
// it describes. Nothing is trimmed: a truncated list of what is wrong with a
// creature is worse than none, because you cannot tell what was cut.
const pillsSx = {
  position: 'absolute',
  left: '50%',
  bottom: 'calc(100% + 6px)',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '3px',
  width: 'max-content',
  maxWidth: 230,
  pointerEvents: 'none',
};

const pillSx = {
  px: 0.6,
  py: '1px',
  borderRadius: '9px',
  fontSize: '0.58rem',
  fontWeight: 700,
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  border: '1px solid rgba(0,0,0,0.55)',
};

const conditionPillSx = { bgcolor: '#d69245', color: '#0f0e0d' };
// The same two colours the encounter builder tints its effect pills with.
const advPillSx = { bgcolor: '#4f8a5b', color: '#f3ead6' };
const disPillSx = { bgcolor: '#b3423a', color: '#f3ead6' };
