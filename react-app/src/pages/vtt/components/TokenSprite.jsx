import { useEffect, useRef, useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { RotateCw, Skull } from 'lucide-react';
import { describeEffect, effectId, effectPolarity } from '../../../shared/character/combatEffects.js';
import { DEAD_CONDITION_KEY, conditionLabel } from '../../../shared/character/conditions.js';
import { EntryBlocks } from '../../../shared/character/EntryBlocks.jsx';
import { classIcon } from '../../../shared/character/classIcon.js';
import { fullscreenContainer } from '../logic/fullscreenContainer.js';
import MapObjectGlyph from './MapObjectGlyph.jsx';

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
  resizable = false,
  rotatable = false,
  canSetDeathSaves = false,
  conditionEntries = {},
  onPointerDown,
  onResizePointerDown,
  onRotatePointerDown,
  onDeathSaveChange,
  onContextMenu,
}) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const hoverCloseTimerRef = useRef(null);
  const keepMarksOpen = () => {
    clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = null;
    if (!dragging) setHovered(true);
  };
  const scheduleMarksClose = () => {
    clearTimeout(hoverCloseTimerRef.current);
    // The pills sit just outside the token. Keep them mounted while the pointer
    // crosses that tiny gap, otherwise they vanish before they can be hovered.
    hoverCloseTimerRef.current = setTimeout(() => setHovered(false), 180);
  };
  useEffect(() => () => clearTimeout(hoverCloseTimerRef.current), []);
  // Bestiary artwork is a circular token on a transparent background, so a
  // coloured disc behind it shows through as a ring in the group's colour. The
  // colour is still the fallback for a piece with no art, or whose art fails to
  // load, so the two are tracked rather than assumed.
  const [artworkFailed, setArtworkFailed] = useState(false);
  useEffect(() => { setArtworkFailed(false); }, [token.imageUrl]);
  const showArtwork = Boolean(token.imageUrl) && !artworkFailed;
  // Scenery is a rectangle: a rug or a door forced into a circle is unusable,
  // and it wants none of the creature furniture either.
  const isMapObject = Boolean(token.iconKey);
  const isScenery = token.layer === 'map' && !isMapObject;
  // A piece standing for somebody's character, as opposed to a creature the GM
  // put down. Only these wear a colour: the party is who you need to pick out
  // of a crowded board, and giving every goblin a bright ring buries them.
  const isCharacter = Boolean(token.characterId);
  const ClassIcon = isCharacter ? classIcon(token.className) : null;
  const conditions = token.conditions || [];
  const dead = conditions.includes(DEAD_CONDITION_KEY);
  const visibleConditions = conditions.filter((condition) => condition !== DEAD_CONDITION_KEY);
  const effects = token.effects || [];
  // One badge for everything the GM has flagged on this creature: two counters
  // side by side would be read as one number anyway.
  const marks = visibleConditions.length + effects.length;
  // Opt-in per piece. A scene where every creature wears a bar is unreadable,
  // and which ones do is a call the GM makes at the table, not a default.
  const hasHp = Boolean(token.showHp) && token.hpMax != null && token.hpMax > 0;
  const current = token.hpCurrent ?? token.hpMax;
  const showDeathSaves = isCharacter && Number(current) === 0 && !dead;
  const deathSuccesses = Math.max(0, Math.min(3, Number(token.deathSaves?.success) || 0));
  const deathFailures = Math.max(0, Math.min(3, Number(token.deathSaves?.fail) || 0));
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
    if (isMapObject) return 0;
    if (isScenery) return 0;
    return showArtwork ? 0 : 2;
  };

  return (
    <Box
      onPointerDown={(event) => {
        clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
        setHovered(false);
        setDragging(Boolean(movable));
        onPointerDown?.(event);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onContextMenu={onContextMenu}
      onPointerEnter={keepMarksOpen}
      onPointerLeave={scheduleMarksClose}
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-label={name || 'Token'}
      title={isMapObject ? name : undefined}
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: size,
        height: size,
        pointerEvents: interactive ? 'auto' : 'none',
        // Some descendants (death-save dots and condition pills) intentionally
        // opt back into pointer events. Disable the whole subtree when another
        // map tool owns the pointer so it truly falls through to the viewport.
        ...(!interactive ? { '&, & *': { pointerEvents: 'none !important' } } : null),
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
          borderRadius: isScenery || isMapObject ? 0 : '50%',
          boxSizing: 'border-box',
          // Artwork stands on its own: no disc behind it, which would show
          // through the transparent corners of a bestiary token as a coloured
          // circle. A character keeps a thick ring in their own colour; a
          // creature gets only the thin dark edge that separates it from the
          // map, and none at all once it has its own artwork.
          borderStyle: 'solid',
          borderWidth: ringWidth(),
          borderColor: isCharacter ? (token.color || 'rgba(0,0,0,0.6)') : 'rgba(0,0,0,0.6)',
          bgcolor: isScenery || isMapObject || showArtwork ? 'transparent' : (token.color || 'secondary.main'),
          outline: token.layer === 'gm' ? '2px dashed rgba(232,201,106,0.9)' : 'none',
          outlineOffset: '-4px',
          overflow: isMapObject ? 'visible' : 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: dead ? 0.58 : 1,
          filter: dead ? 'grayscale(0.75)' : 'none',
        }}
      >
        {isMapObject ? (
          <Box sx={{
            ...mapObjectSx,
            color: token.color || '#e8c96a',
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
        ) : ClassIcon ? (
          <Box data-class-icon={token.className || 'unknown'} sx={classIconSx}>
            <ClassIcon size={Math.max(16, Math.min(32, (Number(size) || 48) * 0.46))} />
          </Box>
        ) : (
          <Typography sx={initialsSx}>{initials(name)}</Typography>
        )}
      </Box>

      {dead ? (
        <Box aria-label="Dead" title="Dead" sx={deadBadgeSx}>
          <Skull size={14} strokeWidth={2.4} />
        </Box>
      ) : null}

      {isMapObject && resizable ? (
        <Box
          component="button"
          type="button"
          aria-label={`Resize ${name || 'object'}`}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onResizePointerDown?.(event);
          }}
          sx={resizeHandleSx}
        />
      ) : null}

      {isMapObject && rotatable ? (
        <Box
          component="button"
          type="button"
          aria-label={`Rotate ${name || 'object'}`}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRotatePointerDown?.(event);
          }}
          sx={rotateHandleSx}
        >
          <RotateCw size={10} strokeWidth={2.8} />
        </Box>
      ) : null}

      {/* Bars and plate stack under the piece. The numbers ride inside the bar
          rather than beside it: one strip to read instead of two things to
          line up, and it stays legible over any map. */}
      {!isScenery && (hasHp || showDeathSaves || name) ? (
        <Box sx={stackSx}>
          {/* The whole name, not an abbreviation: two goblins are only told
              apart by their letter. First in the stack, so the eye reads who it
              is before how hurt they are. */}
          {name ? <Box sx={plateSx}>{name}</Box> : null}

          {showDeathSaves ? (
            <Box
              aria-label={`${deathSuccesses} death save successes, ${deathFailures} failures`}
              title={`${deathSuccesses}/3 successes · ${deathFailures}/3 failures`}
              sx={{ ...deathTrackSx, pointerEvents: canSetDeathSaves ? 'auto' : 'none' }}
            >
              <Box sx={deathDotsSx}>
                {[0, 1, 2].map((index) => (
                  <Box
                    component="button"
                    type="button"
                    key={`success-${index}`}
                    aria-label={`Death save success ${index + 1}`}
                    disabled={!canSetDeathSaves}
                    data-death-save="success"
                    data-active={index < deathSuccesses ? 'true' : 'false'}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeathSaveChange?.('success', deathSuccesses === index + 1 ? index : index + 1);
                    }}
                    sx={{ ...deathDotSx, ...(index < deathSuccesses ? deathSuccessSx : null) }}
                  />
                ))}
              </Box>
              <Box sx={deathDividerSx} />
              <Box sx={deathDotsSx}>
                {[0, 1, 2].map((index) => (
                  <Box
                    component="button"
                    type="button"
                    key={`failure-${index}`}
                    aria-label={`Death save failure ${index + 1}`}
                    disabled={!canSetDeathSaves}
                    data-death-save="failure"
                    data-active={index < deathFailures ? 'true' : 'false'}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeathSaveChange?.('fail', deathFailures === index + 1 ? index : index + 1);
                    }}
                    sx={{ ...deathDotSx, ...(index < deathFailures ? deathFailureSx : null) }}
                  />
                ))}
              </Box>
            </Box>
          ) : hasHp ? (
            <Box sx={hpBarSx} title={`${current} / ${token.hpMax}`}>
              <Box sx={{ ...hpFillSx, width: `${ratio * 100}%`, bgcolor: hpColor(ratio) }} />
              <Box component="span" sx={hpTextSx}>{current}/{token.hpMax}</Box>
            </Box>
          ) : null}

          {/* Its own bar, under the real one: temporary hit points sit on top of
              the maximum, so folding them into the same strip would show a
              character healthier than they can be. Scaled against max HP just to
              give the cushion a size — it has no maximum of its own. */}
          {hasHp && !showDeathSaves && token.tempHp > 0 ? (
            <Box sx={tempBarSx} title={`${token.tempHp} temporary hit points`}>
              <Box sx={{ ...tempFillSx, width: `${tempRatio * 100}%` }} />
              <Box component="span" sx={tempTextSx}>+{token.tempHp}</Box>
            </Box>
          ) : null}
        </Box>
      ) : null}

      {marks && (!hovered || dragging) ? <Box sx={badgeSx}>{marks}</Box> : null}

      {/* One pill each, wrapped: a run-on sentence of six states is read as a
          wall, while pills are counted at a glance and colour-coded by kind. */}
      {marks && hovered && !dragging ? (
        <Box sx={pillsSx} onPointerEnter={keepMarksOpen} onPointerLeave={scheduleMarksClose}>
          {visibleConditions.map((key) => (
            <ConditionTokenPill key={key} conditionKey={key} entries={conditionEntries[key]} />
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

function ConditionTokenPill({ conditionKey, entries }) {
  const label = conditionLabel(conditionKey);
  const pill = (
    <Box
      component="span"
      tabIndex={0}
      onPointerDown={(event) => event.stopPropagation()}
      sx={{ ...pillSx, ...conditionPillSx }}
    >
      {label}
    </Box>
  );

  if (!entries?.length) return pill;

  return (
    <Tooltip
      arrow
      placement="top"
      title={(
        <Box sx={conditionTooltipBodySx}>
          <Typography sx={conditionTooltipTitleSx}>{label}</Typography>
          <EntryBlocks
            entries={entries}
            spacing={0.45}
            fontSize="0.68rem"
            headingColor="#edc36f"
            bodyColor="#f3ead6"
            markerColor="#edc36f"
            strongColor="#edc36f"
            emptyText={null}
          />
        </Box>
      )}
      slotProps={{
        popper: { container: fullscreenContainer },
        tooltip: { sx: conditionTooltipSx },
      }}
    >
      {pill}
    </Tooltip>
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

const classIconSx = {
  display: 'flex',
  color: '#f3ead6',
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))',
  pointerEvents: 'none',
};

const mapObjectSx = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.95))',
  pointerEvents: 'none',
};

const resizeHandleSx = {
  position: 'absolute',
  right: -5,
  bottom: -5,
  zIndex: 5,
  width: 14,
  height: 14,
  p: 0,
  borderRadius: '3px',
  border: '2px solid rgba(15,14,13,0.95)',
  bgcolor: '#e8c96a',
  boxShadow: '0 1px 4px rgba(0,0,0,0.85)',
  cursor: 'nwse-resize',
  touchAction: 'none',
  '&:hover': { bgcolor: '#f4dda0' },
};

const rotateHandleSx = {
  position: 'absolute',
  right: -5,
  top: -5,
  zIndex: 5,
  width: 16,
  height: 16,
  p: 0,
  borderRadius: '50%',
  border: '2px solid rgba(15,14,13,0.95)',
  bgcolor: '#e8c96a',
  color: '#0f0e0d',
  boxShadow: '0 1px 4px rgba(0,0,0,0.85)',
  cursor: 'grab',
  touchAction: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': { bgcolor: '#f4dda0' },
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

const deathTrackSx = {
  height: 18,
  px: 0.55,
  borderRadius: 3,
  bgcolor: 'rgba(0,0,0,0.82)',
  border: '1px solid rgba(0,0,0,0.65)',
  display: 'flex',
  alignItems: 'center',
  gap: 0.45,
  boxSizing: 'border-box',
};

const deathDotsSx = { display: 'flex', alignItems: 'center', gap: '3px' };

const deathDotSx = {
  minWidth: 0,
  width: 10,
  height: 10,
  p: 0,
  borderRadius: '50%',
  bgcolor: 'rgba(226,218,198,0.12)',
  border: '1px solid rgba(226,218,198,0.44)',
  boxSizing: 'border-box',
  cursor: 'pointer',
  '&:disabled': { cursor: 'default' },
};

const deathSuccessSx = {
  bgcolor: '#4f9c62',
  borderColor: '#7bc78a',
  boxShadow: '0 0 4px rgba(79,156,98,0.8)',
};

const deathFailureSx = {
  bgcolor: '#b3423a',
  borderColor: '#df6b62',
  boxShadow: '0 0 4px rgba(179,66,58,0.8)',
};

const deathDividerSx = { width: 1, height: 9, bgcolor: 'rgba(232,201,106,0.34)' };

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

const deadBadgeSx = {
  position: 'absolute',
  top: '-7px',
  left: '-7px',
  width: 20,
  height: 20,
  borderRadius: '50%',
  bgcolor: '#8f2f34',
  color: '#f7e9dc',
  border: '2px solid rgba(15,14,13,0.92)',
  boxShadow: '0 2px 5px rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  pointerEvents: 'none',
  zIndex: 2,
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
  pointerEvents: 'auto',
  // Invisible hover bridge across the visual gap between disc and pills.
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '100%',
    left: 0,
    width: '100%',
    height: 6,
  },
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
const conditionTooltipSx = {
  maxWidth: 360,
  p: 0,
  bgcolor: 'rgba(15,14,13,0.98)',
  border: '1px solid rgba(214,146,69,0.55)',
  boxShadow: 8,
  '& .MuiTooltip-arrow': { color: 'rgba(15,14,13,0.98)' },
};
const conditionTooltipBodySx = { p: 1 };
const conditionTooltipTitleSx = {
  mb: 0.55,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.72rem',
  fontWeight: 800,
  letterSpacing: '0.06em',
  color: '#d69245',
};
// The same two colours the encounter builder tints its effect pills with.
const advPillSx = { bgcolor: '#4f8a5b', color: '#f3ead6' };
const disPillSx = { bgcolor: '#b3423a', color: '#f3ead6' };
