import { useRef, useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import { RotateCw, Skull } from 'lucide-react';
import { DEAD_CONDITION_KEY } from '../../../shared/character/combat/conditions.js';
import { classIcon } from '../../../shared/character/profile/classIcon.js';
import { isMapPiece } from '../../../shared/vtt/map/mapObjects.js';
import TokenArt from './TokenArt.jsx';
import TokenVitalsStack from './TokenVitalsStack.jsx';
import { TokenExpandedMarks, TokenReminderLine } from './TokenSpriteMarks.jsx';
import { useArtworkRetry } from './useArtworkRetry.js';
import { useTokenMarksGesture } from './useTokenMarksGesture.js';
import {
  resizeHandleSx,
  rotateHandleSx,
  cellLayoutSx,
  discFrameSx,
  pieceLayoutSx,
  pieceFrameSx,
  badgeSx,
  deadBadgeSx,
} from './tokenSpriteStyles.js';
import { isDying } from '../../../shared/character/combat/mortality.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { isSecretPiece } from '../../../shared/vtt/scene/scene.js';

// One piece on the map: the artwork, its name plate underneath, a hit point bar
// and the conditions badge. Kept apart from the viewport because the viewport is
// about coordinates and this is about a creature.

export default function TokenSprite({
  token,
  size,
  hex = false,
  dimmed,
  // The GM is working on the GM layer: its pieces are what is being edited,
  // so they stand at full strength there instead of faded as secrets.
  gmLayerActive = false,
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
  // Scenery is a rectangle: a rug or a door forced into a circle is unusable,
  // and it wants none of the creature furniture either. This is based on what
  // the piece is, not its editing layer: token-maker portraits remain tokens
  // even when the GM happens to create one while arranging the map layer.
  const isMapObject = Boolean(token.iconKey);
  // A secret is faded, so the GM sees what the table does not. Not a GM-layer
  // piece while the GM works on the GM layer: there it is what is being edited.
  const fadedAsSecret = token.layer === 'gm' ? !gmLayerActive : isSecretPiece(token);
  // An uploaded picture gets the same corner handles as an icon: it is placed at
  // the size it should cover, and that size is never right on the first drop.
  const hasHandles = isMapPiece(token);
  const isScenery = hasHandles && !isMapObject;
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

  const {
    rootRef, hovered, pinned, dragging, keepMarksOpen, scheduleMarksClose, rootHandlers,
  } = useTokenMarksGesture({ tokenId: token.id, movable, expandable, onInspectionChange, onPointerDown });

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
  const { showArtwork, markArtworkFailed } = useArtworkRetry(token.imageUrl);

  // A piece standing for somebody's character, as opposed to a creature the GM
  // put down. Only these wear a colour: the party is who you need to pick out
  // of a crowded board, and giving every goblin a bright ring buries them.
  const isCharacter = Boolean(token.characterId);
  const hasUploadedArtworkRing = showArtwork
    && Boolean(token.imagePath)
    && !hasHandles
    && Boolean(token.color);
  const ClassIcon = isCharacter ? classIcon(token.className) : null;
  // Placement previews have no id until saved; two missing ids are not a match.
  const remotelyExpanded = Boolean(presentedInspection?.tokenId)
    && presentedInspection.tokenId === token.id;
  const marksExpanded = expandable && !dragging && (hovered || pinned || remotelyExpanded);
  // Opt-in per piece. A scene where every creature wears a bar is unreadable,
  // and which ones do is a call the GM makes at the table, not a default.
  const hasHp = Boolean(token.showHp) && token.hpMax != null && token.hpMax > 0;
  const current = token.hpCurrent ?? token.hpMax;
  const showDeathSaves = isDying({ player: isCharacter, hp: current, conditions });
  // The label the GM typed in secret replaces the public one for them only; a
  // player never receives it in the first place.
  const name = token.secretLabel || token.label || '';

  return (
    <Box
      ref={rootRef}
      {...rootHandlers}
      onContextMenu={onContextMenu}
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
        opacity: dimmed ? OPACITY.line : (fadedAsSecret || staged ? OPACITY.strong : 1),
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
        {!hasHandles && reminders.length ? <TokenReminderLine reminders={reminders} /> : null}

        <Box sx={hasHandles ? pieceFrameSx : discFrameSx}>
          <TokenArt
            token={token}
            name={name}
            isMapObject={isMapObject}
            isScenery={isScenery}
            isCharacter={isCharacter}
            hasHandles={hasHandles}
            showArtwork={showArtwork}
            hasUploadedArtworkRing={hasUploadedArtworkRing}
            ClassIcon={ClassIcon}
            dead={dead}
            onArtworkError={markArtworkFailed}
          />

          {dead ? (
            <Box aria-label="Dead" title="Dead" sx={deadBadgeSx}>
              <Skull size="64%" strokeWidth={2.4} />
            </Box>
          ) : null}

          {marks && !marksExpanded ? <Box sx={badgeSx}>{marks}</Box> : null}
        </Box>

        {!isScenery && (hasHp || showDeathSaves || name) ? (
          <TokenVitalsStack
            token={token}
            name={name}
            hex={hex}
            hasHandles={hasHandles}
            hasHp={hasHp}
            current={current}
            showDeathSaves={showDeathSaves}
            canSetDeathSaves={canSetDeathSaves}
            onDeathSaveChange={onDeathSaveChange}
          />
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
          <RotateCw size={ICON_SIZES.xxs} strokeWidth={2.8} />
        </Box>
      ) : null}

      {marksExpanded ? (
        <TokenExpandedMarks
          tokenId={token.id}
          conditions={visibleConditions}
          reminders={moreReminders}
          conditionEntries={conditionEntries}
          remotelyExpanded={remotelyExpanded}
          presentedInspection={presentedInspection}
          onInspectionChange={onInspectionChange}
          onPointerEnter={keepMarksOpen}
          onPointerLeave={scheduleMarksClose}
        />
      ) : null}
    </Box>
  );
}

// A pointy-top hex is narrow at its top and bottom points, so on a hex grid
// the column is pulled in from those ends to keep the plate and the reminder
// line where the hex is still wide.
const HEX_INSET = '8% 0';
