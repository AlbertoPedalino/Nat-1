import { useRef } from 'react';
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Menu,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { fullscreenContainer } from '../map/fullscreenContainer.js';
import { coarsePointer, useMenuPlacement } from '../map/menuPlacement.js';
import { battleMapDialogPaperSx } from '../map/battleMapSurface.js';
import { useTokenMenuState } from './useTokenMenuState.js';
import TokenHpRow from './TokenHpRow.jsx';
import DeathSaveControls from './DeathSaveControls.jsx';
import TokenMarkers from './TokenMarkers.jsx';
import TokenMenuActions from './TokenMenuActions.jsx';
import { compactFieldSx, sectionTitleSx } from './tokenMenuStyles.js';

// Right-click menu on the piece itself. Label, conditions and removal used to be
// spread between a top-bar button and nothing at all; they belong on the thing
// they act upon.
// `canEdit` is what separates the two audiences. A player gets conditions and
// nothing else: they may mark an enemy as prone, which goes through an RPC that
// writes that one column, but the label, the hit points and the piece itself are
// not theirs to touch.
export default function TokenMenu({
  token, anchor, canEdit = true, canShowHp = true, canRemove = true, canMark = true,
  canSetEffects = true, canSetDeathSaves = true, canStyleObject = true,
  onClose, onSave, onObjectStyle, onVisibility, onDelete,
  // Set for the GM: temporary and maximum hit points and the "+ 5 -" stepper,
  // as health commands (modifyHp, setTempHp, ...) whatever the piece is.
  onVitals = null,
  // Set only for a creature whose stat block the GM can open from here.
  onStatBlock = null,
  // Set only for a character whose sheet this user can open (the GM any,
  // a player their own): the touch way to what a click on the piece does.
  onSheet = null,
}) {
  // At the press; on a touch screen left there while typing, lifted only to
  // keep the field above the keyboard.
  const placement = useMenuPlacement(anchor);
  const fields = useTokenMenuState(token, { onSave, onVitals });
  const { label, gmOnly, conditions, hpCurrent, showHp, effects, deathSaves, save } = fields;
  const objectStyleTimerRef = useRef(null);

  if (!token) return null;
  const isMapObject = Boolean(token.iconKey);
  // Read off the piece rather than kept in state: the layer is written
  // optimistically and rolled back if the database refuses, and a local copy
  // would keep showing the tick that never took.
  const hiddenFromPlayers = Boolean(token.hiddenFromPlayers) || token.layer === 'gm';


  const menuWidth = isMapObject ? 270 : 360;

  return (
    <Menu
      open={Boolean(anchor)}
      onClose={onClose}
      {...placement.menuProps}
      container={fullscreenContainer}
      slotProps={{
        transition: placement.transitionProps,
        paper: {
          sx: {
            ...battleMapDialogPaperSx,
            width: menuWidth,
            maxWidth: 'calc(100vw - 16px)',
            // Of the visible window, not 100vh: on a phone 100vh is taller than
            // the screen while the browser bar shows, and a menu that tall gets
            // pushed up past the top edge. 32px leaves Popover's 16px margins.
            maxHeight: 'calc(100% - 32px)',
            '& .MuiMenu-list': { p: 0 },
          },
        },
      }}
    >
      <Stack spacing={0.65} sx={{ px: 1, py: 0.75 }}>
        {/* Whether the table sees the piece at all. A trap, hoard or hidden map
            prop arrives with this already ticked; clearing it is how the GM
            reveals it. Normal map/token layers stay intact, while a legacy GM
            layer row falls back to tokens. */}
        {onVisibility ? (
          <>
            <FormControlLabel
              control={(
                <Checkbox
                  size="small"
                  checked={hiddenFromPlayers}
                  onChange={(event) => onVisibility(token, event.target.checked)}
                />
              )}
              label={<Typography sx={controlLabelSx}>Hidden from the players</Typography>}
              sx={formControlSx}
            />
            <Divider />
          </>
        ) : null}

        {canEdit ? (
          <>
          <TextField
            label="Label"
            size="small"
            // Not on a touch screen: focusing a field there raises the keyboard
            // and the page slides up under the finger that held the piece.
            autoFocus={!coarsePointer()}
            value={label}
            onChange={(event) => fields.changeLabel(event.target.value)}
            onBlur={() => save({})}
            onKeyDown={(event) => {
              // The menu swallows keys otherwise. Enter closes rather than
              // saving, because saving has already happened.
              event.stopPropagation();
              if (event.key === 'Enter') { save({}); onClose(); }
            }}
            sx={compactFieldSx}
          />
          <FormControlLabel
            control={(
              <Checkbox
                size="small"
                checked={gmOnly}
                onChange={(event) => fields.changeGmOnly(event.target.checked)}
              />
            )}
            label={<Typography sx={controlLabelSx}>Label visible to the GM only</Typography>}
            sx={formControlSx}
          />

          {!isMapObject ? <Divider /> : null}

          {/* The same row on every piece. A character's hit points are edited
              as health commands on their sheet, an encounter creature's on its
              fight, any other piece's in its GM-only values: never a copy on
              the piece. Without the commands a character's are not shown. */}
          {!isMapObject && (onVitals || !token.characterId) ? <>
            <TokenHpRow fields={fields} withVitals={Boolean(onVitals)} onClose={onClose} />
            <Divider />
          </> : null}
          </>
        ) : null}

        {isMapObject ? (
          <Box sx={objectStyleSx}>
            <Typography sx={sectionTitleSx}>Object color</Typography>
            <Box
              key={`${token.id}-color`}
              component="input"
              type="color"
              aria-label="Object color"
              title="Object color"
              disabled={!canStyleObject}
              defaultValue={token.color || VTT_COLORS.gold}
              onInput={(event) => {
                const color = event.currentTarget.value;
                clearTimeout(objectStyleTimerRef.current);
                objectStyleTimerRef.current = setTimeout(() => {
                  onObjectStyle?.(token, { color });
                }, OBJECT_STYLE_DELAY);
              }}
              sx={objectColorInputSx}
            />
          </Box>
        ) : null}

        {/* Whether a piece wears a bar is its owner's call, GM or player: it is
            an ordinary column on a row they already control. */}
        {canShowHp && !isMapObject ? (
          <FormControlLabel
            control={(
              <Checkbox
                size="small"
                checked={showHp}
                onChange={(event) => fields.changeShowHp(event.target.checked)}
              />
            )}
            label={<Typography sx={controlLabelSx}>Show the hit point bar</Typography>}
            sx={formControlSx}
          />
        ) : null}

        {!isMapObject && token.characterId && Number(hpCurrent) === 0 ? (
          <DeathSaveControls
            deathSaves={deathSaves}
            disabled={!canSetDeathSaves}
            onChange={fields.markDeathSave}
          />
        ) : null}

        {!isMapObject ? (
          <TokenMarkers
            conditions={conditions}
            effects={effects}
            canMark={canMark}
            canSetEffects={canSetEffects}
            onConditionClick={fields.clickCondition}
            onAddReminder={fields.addReminderText}
            onRemoveReminder={fields.removeReminder}
          />
        ) : null}

        <Divider />

        <TokenMenuActions
          token={token}
          canRemove={canRemove}
          onClose={onClose}
          onSheet={onSheet}
          onStatBlock={onStatBlock}
          onDelete={onDelete}
        />
      </Stack>
    </Menu>
  );
}

const OBJECT_STYLE_DELAY = 180;

const formControlSx = {
  m: 0,
  minHeight: 24,
  '& .MuiCheckbox-root': { p: 0.35, mr: 0.25 },
  '& .MuiSvgIcon-root': { fontSize: 17 },
};

const controlLabelSx = { fontSize: '0.68rem', lineHeight: 1.2 };

const objectStyleSx = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 34px',
  alignItems: 'center',
  gap: 0.6,
  p: 0.6,
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldTint',
  borderRadius: 1,
};
const objectColorInputSx = {
  width: 32,
  height: 32,
  p: '2px',
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldBorderStrong',
  borderRadius: 1,
  bgcolor: 'gmboard.vtt.inset',
  cursor: 'pointer',
  '&:disabled': { cursor: 'default', opacity: 0.45 },
};
