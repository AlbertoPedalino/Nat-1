import {
  Box,
  Divider,
  TextField,
} from '@mui/material';
import { Trash2 } from 'lucide-react';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { coarsePointer } from '../map/menuPlacement.js';
import { battleMapCompactFieldSx } from '../map/battleMapSurface.js';
import MapMenu, { HiddenFromPlayersToggle, MenuFooterActions } from '../map/MapMenu.jsx';
import MapSectionTitle from '../map/MapSectionTitle.jsx';
import { useTokenMenuState } from './useTokenMenuState.js';
import TokenHpRow from './TokenHpRow.jsx';
import DeathSaveControls from './DeathSaveControls.jsx';
import TokenMarkers from './TokenMarkers.jsx';
import { useDebouncedCallback } from '../../../shared/ui/useDebouncedCallback.js';
import ColorField from '../../../shared/ui/ColorField.jsx';
import ToggleRow from '../../../shared/ui/ToggleRow.jsx';
import { atDeathsDoor } from '../../../shared/character/combat/mortality.js';
import { isSecretPiece } from '../../../shared/vtt/scene/scene.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

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
  const fields = useTokenMenuState(token, { onSave, onVitals });
  const { label, gmOnly, conditions, hpCurrent, showHp, effects, deathSaves, save } = fields;
  const saveObjectColor = useDebouncedCallback((color) => onObjectStyle?.(token, { color }), OBJECT_STYLE_DELAY);

  if (!token) return null;
  const isMapObject = Boolean(token.iconKey);
  // Read off the piece rather than kept in state: the layer is written
  // optimistically and rolled back if the database refuses, and a local copy
  // would keep showing the tick that never took.
  const hiddenFromPlayers = isSecretPiece(token);

  const menuWidth = isMapObject ? 270 : 360;

  // The bottom row's actions, each shown only when this user may use it.
  const actions = [
    onSheet ? { label: 'Sheet', icon: GAME_ICONS.characterSheet, onClick: () => onSheet(token) } : null,
    onStatBlock ? { label: 'Stat block', icon: GAME_ICONS.statBlock, onClick: () => onStatBlock(token) } : null,
    // A player may take back what they put down — their own piece or a
    // marker they dropped — and the delete policy says the same.
    canRemove ? { label: 'Remove', icon: Trash2, color: 'error', onClick: () => onDelete(token) } : null,
  ].filter(Boolean);

  // At the press; on a touch screen left there while typing, lifted only to
  // keep the field above the keyboard (MapMenu's placement).
  return (
    <MapMenu point={anchor} onClose={onClose} width={menuWidth}>
      {/* Whether the table sees the piece at all. A trap, hoard or hidden map
          prop arrives with this already ticked; clearing it is how the GM
          reveals it. Normal map/token layers stay intact, while a legacy GM
          layer row falls back to tokens. */}
      {onVisibility ? (
        <>
          <HiddenFromPlayersToggle
            checked={hiddenFromPlayers}
            onChange={(hidden) => onVisibility(token, hidden)}
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
          sx={battleMapCompactFieldSx}
        />
        <ToggleRow
          dense
          control="checkbox"
          label="Label visible to the GM only"
          checked={gmOnly}
          onChange={fields.changeGmOnly}
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
          <MapSectionTitle>Object color</MapSectionTitle>
          <ColorField
            key={`${token.id}-color`}
            label="Object color"
            title="Object color"
            disabled={!canStyleObject}
            value={token.color || VTT_COLORS.accent}
            onChange={saveObjectColor}
          />
        </Box>
      ) : null}

      {/* Whether a piece wears a bar is its owner's call, GM or player: it is
          an ordinary column on a row they already control. */}
      {canShowHp && !isMapObject ? (
        <ToggleRow
          dense
          control="checkbox"
          label="Show the hit point bar"
          checked={showHp}
          onChange={fields.changeShowHp}
        />
      ) : null}

      {!isMapObject && atDeathsDoor({ player: Boolean(token.characterId), hp: hpCurrent }) ? (
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

      <MenuFooterActions onClose={onClose} actions={actions} />
    </MapMenu>
  );
}

const OBJECT_STYLE_DELAY = 180;

const objectStyleSx = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 34px',
  alignItems: 'center',
  gap: 0.5,
  p: 0.5,
  border: '1px solid',
  borderColor: 'gmboard.vtt.accentTint',
  borderRadius: 1,
};
