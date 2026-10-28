import { useEffect, useRef, useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { RotateCw, Skull } from 'lucide-react';
import { effectId } from '../../../shared/character/combat/combatEffects.js';
import { DEAD_CONDITION_KEY, conditionLabel } from '../../../shared/character/combat/conditions.js';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import { classIcon } from '../../../shared/character/profile/classIcon.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { fullscreenContainer } from '../map/fullscreenContainer.js';
import MapObjectGlyph from '../objects/MapObjectGlyph.jsx';
import { isMapPiece } from '../../../shared/vtt/map/mapObjects.js';

// One piece on the map: the artwork, its name plate underneath, a hit point bar
// and the conditions badge. Kept apart from the viewport because the viewport is
// about coordinates and this is about a creature.

// A tap is a touch that neither moved nor lasted long enough to be the long
// press that opens the token menu (the viewport's own numbers).
const TAP_MAX_MS = 480;
const TAP_SLOP = 12;

export default function TokenSprite({
  token,
  size,
  hex = false,
  dimmed,
  staged,
  interactive,
  movable,
  resizable = false,
  rotatable = false,
  canSetDeathSaves = false,
  conditionEntries = {},
  presentedInspection = null,
  onInspectionChange,
  onPointerDown,
  onResizePointerDown,
  onRotatePointerDown,
  onDeathSaveChange,
  onContextMenu,
}) {
  const [hovered, setHovered] = useState(false);
  // A finger cannot hover, so on a tablet or a phone the conditions are opened
  // by tapping the piece and stay open until it is tapped again or the finger
  // lands anywhere else.
  const [pinned, setPinned] = useState(false);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef(null);
  const touchRef = useRef(null);
  const hoverCloseTimerRef = useRef(null);
  const keepMarksOpen = (event) => {
    // Touch fires enter/leave around every tap; that is not a hover.
    if (event?.pointerType === 'touch') return;
    clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = null;
    if (!dragging) {
      setHovered(true);
      onInspectionChange?.({ tokenId: token.id, conditionKey: null });
    }
  };
  const scheduleMarksClose = (event) => {
    if (event?.pointerType === 'touch') return;
    clearTimeout(hoverCloseTimerRef.current);
    // The pills sit just outside the token. Keep them mounted while the pointer
    // crosses that tiny gap, otherwise they vanish before they can be hovered.
    hoverCloseTimerRef.current = setTimeout(() => {
      setHovered(false);
      onInspectionChange?.(null);
    }, 180);
  };
  useEffect(() => () => clearTimeout(hoverCloseTimerRef.current), []);
  const unpin = () => {
    setPinned(false);
    onInspectionChange?.(null);
  };
  useEffect(() => {
    if (!pinned) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) unpin();
    };
    document.addEventListener('pointerdown', closeOutside, true);
    return () => document.removeEventListener('pointerdown', closeOutside, true);
  });
  // The resize hint is controlled rather than left to MUI's own hover, so it can
  // be dismissed the moment the drag starts: a label sitting over the piece
  // being sized is exactly what you need to see past. It stays down until the
  // button is released, or re-entering the handle mid-drag would summon it back.
  const [resizeHintOpen, setResizeHintOpen] = useState(false);
  const resizingRef = useRef(false);
  const dismissResizeHint = () => {
    resizingRef.current = true;
    setResizeHintOpen(false);
    window.addEventListener('pointerup', () => { resizingRef.current = false; }, { once: true });
  };
  // Keep artwork failure separate from the colour fallback so an unavailable
  // portrait still leaves a usable piece on the board.
  const [artworkFailed, setArtworkFailed] = useState(false);
  useEffect(() => { setArtworkFailed(false); }, [token.imageUrl]);
  useEffect(() => {
    if (!artworkFailed || !token.imageUrl) return undefined;
    // Remount the failed image even when signing returns the same cached URL.
    const retry = () => setArtworkFailed(false);
    const retryWhenVisible = () => {
      if (document.visibilityState === 'visible') retry();
    };
    const timer = window.setTimeout(retry, 5000);
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    document.addEventListener('visibilitychange', retryWhenVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('online', retry);
      window.removeEventListener('focus', retry);
      document.removeEventListener('visibilitychange', retryWhenVisible);
    };
  }, [artworkFailed, token.imageUrl]);
  const showArtwork = Boolean(token.imageUrl) && !artworkFailed;
  // Scenery is a rectangle: a rug or a door forced into a circle is unusable,
  // and it wants none of the creature furniture either. This is based on what
  // the piece is, not its editing layer: token-maker portraits remain tokens
  // even when the GM happens to create one while arranging the map layer.
  const isMapObject = Boolean(token.iconKey);
  // An uploaded picture gets the same corner handles as an icon: it is placed at
  // the size it should cover, and that size is never right on the first drop.
  const hasHandles = isMapPiece(token);
  const isScenery = hasHandles && !isMapObject;
  // A piece standing for somebody's character, as opposed to a creature the GM
  // put down. Only these wear a colour: the party is who you need to pick out
  // of a crowded board, and giving every goblin a bright ring buries them.
  const isCharacter = Boolean(token.characterId);
  const hasUploadedArtworkRing = showArtwork
    && Boolean(token.imagePath)
    && !hasHandles
    && Boolean(token.color);
  const ClassIcon = isCharacter ? classIcon(token.className) : null;
  const conditions = token.conditions || [];
  const dead = conditions.includes(DEAD_CONDITION_KEY);
  const visibleConditions = conditions.filter((condition) => condition !== DEAD_CONDITION_KEY);
  // Reminders ("Bardic Inspiration", "Guidance") are written out above the
  // piece at all times: they are there to be read at a glance, which a count
  // behind a hover is not. Only conditions are counted in the badge.
  const reminders = token.effects || [];
  const marks = visibleConditions.length;
  // Hovering or tapping opens what the cell has no room for: the condition
  // pills and the reminders after the first. The first one stays where it is
  // written, so nothing on the piece moves under the pointer. Objects have no
  // reminder line of their own, so theirs all open above.
  const moreReminders = hasHandles ? reminders : reminders.slice(1);
  const expandable = marks > 0 || moreReminders.length > 0;
  // Placement previews have no id until saved; two missing ids are not a match.
  const remotelyExpanded = Boolean(presentedInspection?.tokenId)
    && presentedInspection.tokenId === token.id;
  const marksExpanded = expandable && !dragging && (hovered || pinned || remotelyExpanded);
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
    if (hasUploadedArtworkRing) return 5;
    return showArtwork ? 0 : 2;
  };

  return (
    <Box
      ref={rootRef}
      onPointerDown={(event) => {
        clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
        setHovered(false);
        touchRef.current = event.pointerType === 'touch' && event.isPrimary
          ? { x: event.clientX, y: event.clientY, at: event.timeStamp }
          : null;
        if (!touchRef.current) onInspectionChange?.(null);
        setDragging(Boolean(movable));
        onPointerDown?.(event);
      }}
      onPointerMove={(event) => {
        const touch = touchRef.current;
        if (!touch || Math.hypot(event.clientX - touch.x, event.clientY - touch.y) <= TAP_SLOP) return;
        // Became a drag: the open pills would only be dragged along.
        touchRef.current = null;
        if (pinned) unpin();
      }}
      onPointerUp={(event) => {
        setDragging(false);
        const touch = touchRef.current;
        touchRef.current = null;
        if (!touch || !expandable || event.timeStamp - touch.at >= TAP_MAX_MS) return;
        if (Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > TAP_SLOP) return;
        if (pinned) {
          unpin();
        } else {
          setPinned(true);
          onInspectionChange?.({ tokenId: token.id, conditionKey: null });
        }
      }}
      onPointerCancel={() => {
        touchRef.current = null;
        setDragging(false);
      }}
      onContextMenu={onContextMenu}
      onPointerEnter={keepMarksOpen}
      onPointerLeave={scheduleMarksClose}
      // Lets the piece's holder on the map lift it above its neighbours.
      data-marks-expanded={marksExpanded ? 'true' : undefined}
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
        opacity: dimmed ? 0.3 : (token.hiddenFromPlayers || token.layer === 'gm' || staged ? 0.6 : 1),
        filter: staged ? 'grayscale(0.7)' : 'none',
        // Above its neighbours while hovered so the expanded conditions are not
        // covered by the next piece along.
        zIndex: marksExpanded ? 3 : 1,
        touchAction: 'none',
        // Everything on the piece is sized in fractions of it (cqmin), so the
        // name and bars shrink with the cell when the map is zoomed out.
        containerType: 'size',
      }}
    >
      {/* A creature keeps everything that belongs to it inside its own cell:
          the art shrinks to leave room for the reminder line above it and the
          name and hit points below, so neighbouring pieces no longer pile
          their labels on each other. Scenery and objects fill their box and
          keep their label underneath, where resizing them expects it. */}
      <Box sx={hasHandles ? pieceLayoutSx : { ...cellLayoutSx, inset: hex ? HEX_INSET : 0 }}>
        {!hasHandles && reminders.length ? (
          <Box data-token-reminders sx={inlineRemindersSx}>
            <Box component="span" title={reminders[0].text} sx={reminderInlineSx}>
              {reminders[0].text}
            </Box>
            {reminders.length > 1 ? (
              <Box
                component="span"
                title={reminders.slice(1).map((effect) => effect.text).join(', ')}
                sx={{ ...reminderInlineSx, flexShrink: 0 }}
              >
                +{reminders.length - 1}
              </Box>
            ) : null}
          </Box>
        ) : null}

        <Box sx={hasHandles ? pieceFrameSx : discFrameSx}>
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
                ? (token.color || vttAlpha(VTT_COLORS.black, 0.6))
                : vttAlpha(VTT_COLORS.black, 0.6),
              bgcolor: isScenery || isMapObject || showArtwork ? 'transparent' : (token.color || 'secondary.main'),
              outline: token.hiddenFromPlayers || token.layer === 'gm'
                ? `2px dashed ${vttAlpha(VTT_COLORS.gold, 0.9)}`
                : 'none',
              outlineOffset: '-4px',
              // Whose turn it is, readable from across the table and on the
              // projector: a gold halo outside the piece's own ring.
              ...(token.turnActive && !isScenery && !isMapObject ? turnActiveSx : null),
              // A turned piece must not be cut off at the corners of its own box; a
              // creature still needs the clip that crops its art into the circle.
              overflow: hasHandles ? 'visible' : 'hidden',
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
                color: token.color || VTT_COLORS.gold,
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

          {dead ? (
            <Box aria-label="Dead" title="Dead" sx={deadBadgeSx}>
              <Skull size="64%" strokeWidth={2.4} />
            </Box>
          ) : null}

          {marks && !marksExpanded ? <Box sx={badgeSx}>{marks}</Box> : null}
        </Box>

        {/* Bars and plate stack under the art. The numbers ride inside the bar
            rather than beside it: one strip to read instead of two things to
            line up, and it stays legible over any map. */}
        {!isScenery && (hasHp || showDeathSaves || name) ? (
          <Box sx={hasHandles ? stackBelowSx : stackInsideSx}>
            {/* The whole name where it fits; a long one is cut at the edge of
                the cell rather than written across the next. First in the
                stack, so the eye reads who it is before how hurt they are.
                A name the players never receive wears the dashed gold of
                everything else only the GM sees. */}
            {name ? (
              <Box
                sx={{
                  ...plateSx,
                  ...(token.secretLabel ? secretPlateSx : null),
                  maxWidth: hasHandles ? 'none' : (hex ? '100%' : '116%'),
                }}
              >
                {name}
              </Box>
            ) : null}

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
              <Box sx={{ ...hpBarSx, width: hex ? '72%' : '88%' }} title={`${current} / ${token.hpMax}`}>
                <Box sx={{ ...hpFillSx, width: `${ratio * 100}%`, bgcolor: hpColor(ratio) }} />
                <Box component="span" sx={hpTextSx}>{current}/{token.hpMax}</Box>
              </Box>
            ) : null}

            {/* Its own bar, under the real one: temporary hit points sit on top of
                the maximum, so folding them into the same strip would show a
                character healthier than they can be. Scaled against max HP just to
                give the cushion a size — it has no maximum of its own. */}
            {hasHp && !showDeathSaves && token.tempHp > 0 ? (
              <Box sx={{ ...tempBarSx, width: hex ? '60%' : '72%' }} title={`${token.tempHp} temporary hit points`}>
                <Box sx={{ ...tempFillSx, width: `${tempRatio * 100}%` }} />
                <Box component="span" sx={tempTextSx}>+{token.tempHp}</Box>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Box>

      {hasHandles && resizable ? (
        // Each side follows the corner on its own axis, so the two gestures have
        // to be named: nobody discovers a stretch by accident. No modifier is
        // mentioned because none is used — a tablet has no key to hold.
        <Tooltip
          title={isMapObject ? 'Drag to resize' : 'Drag across to scale · one way only to stretch'}
          placement="right"
          open={resizeHintOpen}
          onOpen={() => { if (!resizingRef.current) setResizeHintOpen(true); }}
          onClose={() => setResizeHintOpen(false)}
        >
          <Box
            component="button"
            type="button"
            aria-label={`Resize ${name || 'object'}`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              dismissResizeHint();
              onResizePointerDown?.(event);
            }}
            sx={resizeHandleSx}
          />
        </Tooltip>
      ) : null}

      {hasHandles && rotatable ? (
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

      {/* Opened on hover or tap: one pill each, wrapped, since a run-on
          sentence of six states is read as a wall while pills are counted at a
          glance; then the reminders the cell had no room for. Above the cell
          and over its neighbours, but only while someone is looking at it. */}
      {marksExpanded ? (
        <Box
          sx={aboveSx}
          onPointerEnter={keepMarksOpen}
          onPointerLeave={scheduleMarksClose}
        >
          {marks ? (
            <Box sx={pillsSx}>
              {visibleConditions.map((key) => (
                <ConditionTokenPill
                  key={key}
                  conditionKey={key}
                  entries={conditionEntries[key]}
                  tooltipOpen={remotelyExpanded ? presentedInspection.conditionKey === key : undefined}
                  onInspect={(conditionKey) => onInspectionChange?.({
                    tokenId: token.id,
                    conditionKey,
                  })}
                />
              ))}
            </Box>
          ) : null}
          {moreReminders.length ? (
            <Box sx={remindersSx}>
              {moreReminders.map((effect) => (
                <Box key={effectId(effect)} component="span" title={effect.text} sx={reminderSx}>
                  {effect.text}
                </Box>
              ))}
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

function ConditionTokenPill({ conditionKey, entries, tooltipOpen, onInspect }) {
  const label = conditionLabel(conditionKey);
  const pill = (
    <Box
      component="span"
      tabIndex={0}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerEnter={() => onInspect?.(conditionKey)}
      onPointerLeave={() => onInspect?.(null)}
      onFocus={() => onInspect?.(conditionKey)}
      onBlur={() => onInspect?.(null)}
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
      // A tap on the pill reads its rules; MUI's default asks for a long press.
      enterTouchDelay={0}
      leaveTouchDelay={4000}
      {...(tooltipOpen == null ? null : { open: tooltipOpen })}
      title={(
        <Box sx={conditionTooltipBodySx}>
          <Typography sx={conditionTooltipTitleSx}>{label}</Typography>
          <EntryBlocks
            entries={entries}
            spacing={0.45}
            fontSize="0.68rem"
            headingColor={VTT_COLORS.goldSoft}
            bodyColor={VTT_COLORS.parchment}
            markerColor={VTT_COLORS.goldSoft}
            strongColor={VTT_COLORS.goldSoft}
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
  if (ratio > 0.5) return VTT_COLORS.hpHealthy;
  if (ratio > 0.25) return VTT_COLORS.hpWounded;
  return VTT_COLORS.hpCritical;
}

// A pointy-top hex is narrow at its top and bottom points, so on a hex grid
// the column is pulled in from those ends to keep the plate and the reminder
// line where the hex is still wide.
const HEX_INSET = '8% 0';

const initialsSx = {
  fontSize: 'clamp(8px, 24cqmin, 18px)',
  fontWeight: 800,
  color: vttAlpha(VTT_COLORS.black, 0.75),
  pointerEvents: 'none',
};

const classIconSx = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: VTT_COLORS.parchment,
  filter: `drop-shadow(0 1px 2px ${vttAlpha(VTT_COLORS.black, 0.9)})`,
  pointerEvents: 'none',
};

const mapObjectSx = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  filter: `drop-shadow(0 2px 3px ${vttAlpha(VTT_COLORS.black, 0.95)})`,
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
  border: `2px solid ${vttAlpha(VTT_COLORS.ink, 0.95)}`,
  bgcolor: VTT_COLORS.gold,
  boxShadow: `0 1px 4px ${vttAlpha(VTT_COLORS.black, 0.85)}`,
  cursor: 'nwse-resize',
  touchAction: 'none',
  '&:hover': { bgcolor: VTT_COLORS.goldBright },
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
  border: `2px solid ${vttAlpha(VTT_COLORS.ink, 0.95)}`,
  bgcolor: VTT_COLORS.gold,
  color: VTT_COLORS.ink,
  boxShadow: `0 1px 4px ${vttAlpha(VTT_COLORS.black, 0.85)}`,
  cursor: 'grab',
  touchAction: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': { bgcolor: VTT_COLORS.goldBright },
};

// The cell as one column: reminder line, art, name and bars. The art takes
// whatever height is left and stays round through its aspect ratio, so a piece
// with nothing written on it still fills its cell.
const cellLayoutSx = {
  position: 'absolute',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2cqmin',
};

const discFrameSx = {
  position: 'relative',
  flex: '1 1 0',
  minHeight: 0,
  aspectRatio: '1',
  maxWidth: '100%',
};

const pieceLayoutSx = { position: 'absolute', inset: 0 };
const pieceFrameSx = { position: 'relative', width: '100%', height: '100%' };

const stackInsideSx = {
  flex: 'none',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1px',
  pointerEvents: 'none',
};

// An object's label hangs under it, centred however wide the name is.
const stackBelowSx = {
  ...stackInsideSx,
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: '50%',
  width: 'max-content',
  transform: 'translateX(-50%)',
};

// One line: the first reminder and how many more there are. The rest are a
// hover or a tap away, written out in full above the piece.
const inlineRemindersSx = {
  flex: 'none',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  gap: '2px',
  pointerEvents: 'none',
};

const barBaseSx = {
  position: 'relative',
  borderRadius: 3,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.75),
  border: `1px solid ${vttAlpha(VTT_COLORS.black, 0.6)}`,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

const hpBarSx = { ...barBaseSx, height: 'clamp(6px, 14cqmin, 16px)' };

const deathTrackSx = {
  height: 'clamp(7px, 15cqmin, 18px)',
  px: 'clamp(1px, 3cqmin, 4px)',
  borderRadius: 3,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.82),
  border: `1px solid ${vttAlpha(VTT_COLORS.black, 0.65)}`,
  display: 'flex',
  alignItems: 'center',
  gap: 'clamp(1px, 3cqmin, 4px)',
  boxSizing: 'border-box',
};

const deathDotsSx = { display: 'flex', alignItems: 'center', gap: 'clamp(1px, 2.5cqmin, 3px)' };

const deathDotSx = {
  minWidth: 0,
  width: 'clamp(4px, 9cqmin, 10px)',
  height: 'clamp(4px, 9cqmin, 10px)',
  p: 0,
  borderRadius: '50%',
  bgcolor: vttAlpha(VTT_COLORS.neutralMark, 0.12),
  border: `1px solid ${vttAlpha(VTT_COLORS.neutralMark, 0.44)}`,
  boxSizing: 'border-box',
  cursor: 'pointer',
  '&:disabled': { cursor: 'default' },
};

const deathSuccessSx = {
  bgcolor: VTT_COLORS.deathSuccess,
  borderColor: VTT_COLORS.successBright,
  boxShadow: `0 0 4px ${vttAlpha(VTT_COLORS.deathSuccess, 0.8)}`,
};

const deathFailureSx = {
  bgcolor: VTT_COLORS.danger,
  borderColor: VTT_COLORS.dangerBright,
  boxShadow: `0 0 4px ${vttAlpha(VTT_COLORS.danger, 0.8)}`,
};

const deathDividerSx = { width: 1, height: '60%', bgcolor: vttAlpha(VTT_COLORS.gold, 0.34) };

const hpFillSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  transition: 'width 120ms linear',
};

const textBaseSx = {
  position: 'relative',
  fontSize: 'clamp(6px, 11cqmin, 12px)',
  fontWeight: 700,
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
  // A dark outline keeps the figures readable over both the empty track and a
  // bright fill, without dimming the bar itself.
  textShadow: `0 1px 2px ${vttAlpha(VTT_COLORS.black, 0.9)}`,
};

const hpTextSx = { ...textBaseSx, color: VTT_COLORS.parchment };

const tempBarSx = { ...barBaseSx, height: 'clamp(5px, 10cqmin, 12px)' };

const tempFillSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  bgcolor: VTT_COLORS.tempHp,
  transition: 'width 120ms linear',
};

const tempTextSx = { ...textBaseSx, color: VTT_COLORS.tempHpText, fontSize: 'clamp(5px, 9cqmin, 10px)' };

const plateSx = {
  flex: 'none',
  px: 'clamp(2px, 4cqmin, 5px)',
  borderRadius: 1,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.85),
  color: VTT_COLORS.parchmentMuted,
  // As large as the cell allows, up to what reads across the table on a
  // projector; zoomed far out it gets small rather than spilling over.
  fontSize: 'clamp(5px, 12cqmin, 11px)',
  lineHeight: 1.25,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  boxSizing: 'border-box',
};

const secretPlateSx = {
  outline: `1px dashed ${vttAlpha(VTT_COLORS.gold, 0.9)}`,
  outlineOffset: '-1px',
};

// On the corner of the art, only just past its edge, so it reads as attached
// to the piece without reaching into the next cell.
const badgeSx = {
  position: 'absolute',
  top: '-2px',
  right: '-2px',
  minWidth: 'clamp(10px, 22cqmin, 16px)',
  height: 'clamp(10px, 22cqmin, 16px)',
  px: '2px',
  borderRadius: '8px',
  bgcolor: VTT_COLORS.warning,
  color: VTT_COLORS.ink,
  fontSize: 'clamp(6px, 14cqmin, 10px)',
  fontWeight: 800,
  lineHeight: 'clamp(10px, 22cqmin, 16px)',
  boxSizing: 'border-box',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  transition: 'all 120ms ease',
};

// A thin white ring keeps the colour apart from the art and from the map.
const turnRing = `0 0 0 2px ${VTT_COLORS.white}, 0 0 0 5px ${VTT_COLORS.turnActive}`;
const turnActiveSx = {
  boxShadow: `${turnRing}, 0 0 18px 6px ${vttAlpha(VTT_COLORS.turnActive, 0.7)}`,
  animation: 'gbTurnGlow 1.6s ease-in-out infinite',
  '@keyframes gbTurnGlow': {
    '0%, 100%': { boxShadow: `${turnRing}, 0 0 12px 3px ${vttAlpha(VTT_COLORS.turnActive, 0.55)}` },
    '50%': { boxShadow: `${turnRing}, 0 0 26px 10px ${vttAlpha(VTT_COLORS.turnActive, 0.85)}` },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

const deadBadgeSx = {
  position: 'absolute',
  top: '-3px',
  left: '-3px',
  width: 'clamp(11px, 26cqmin, 20px)',
  height: 'clamp(11px, 26cqmin, 20px)',
  borderRadius: '50%',
  bgcolor: VTT_COLORS.dangerDeep,
  color: VTT_COLORS.deathText,
  border: `2px solid ${vttAlpha(VTT_COLORS.ink, 0.92)}`,
  boxShadow: `0 2px 5px ${vttAlpha(VTT_COLORS.black, 0.75)}`,
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
const aboveSx = {
  position: 'absolute',
  left: '50%',
  bottom: 'calc(100% + 6px)',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '3px',
  width: 'max-content',
  maxWidth: 230,
  // Invisible hover bridge across the visual gap between disc and pills.
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '100%',
    left: 0,
    width: '100%',
    height: 8,
  },
};

const pillsSx = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '3px',
};

// Nearest the piece, under the marks.
const remindersSx = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '2px',
};

// The light blue of the reminder chips on the sheet and in the token menu, so
// the same thing is the same colour everywhere. On a dark plate rather than a
// tint, because it has to stay legible over any map.
const reminderSx = {
  maxWidth: 170,
  px: 0.6,
  py: '1px',
  borderRadius: '10px',
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.88),
  color: 'info.main',
  border: '1px solid',
  borderColor: 'info.main',
  fontSize: '0.74rem',
  fontWeight: 700,
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const reminderInlineSx = {
  ...reminderSx,
  minWidth: 0,
  maxWidth: '100%',
  px: 'clamp(2px, 3cqmin, 5px)',
  py: 0,
  fontSize: 'clamp(6px, 11cqmin, 12px)',
  lineHeight: 1.3,
};

const pillSx = {
  px: 0.6,
  py: '1px',
  borderRadius: '10px',
  fontSize: '0.78rem',
  fontWeight: 700,
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  border: `1px solid ${vttAlpha(VTT_COLORS.black, 0.55)}`,
};

const conditionPillSx = { bgcolor: VTT_COLORS.warning, color: VTT_COLORS.ink };
const conditionTooltipSx = {
  maxWidth: 360,
  p: 0,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.98),
  border: `1px solid ${vttAlpha(VTT_COLORS.warning, 0.55)}`,
  boxShadow: 8,
  '& .MuiTooltip-arrow': { color: vttAlpha(VTT_COLORS.ink, 0.98) },
};
const conditionTooltipBodySx = { p: 1 };
const conditionTooltipTitleSx = {
  mb: 0.55,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.72rem',
  fontWeight: 800,
  letterSpacing: '0.06em',
  color: VTT_COLORS.warning,
};
