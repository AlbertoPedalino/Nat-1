import { Box } from '@mui/material';
import { SourceBadge } from './SpellEntryParts.jsx';
import { PickableSpellRow } from '../../../shared/character/spells/SpellReference.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

// One spell in the sheet's spell picker (Add/Remove and the Wizard's
// spellbook), a pickable row like every picker's (PickableSpellRow). An
// auto-granted spell always shows its tinted source chip (class/subclass/feat,
// the same badge as on the sheet's spell rows), falling back to a plain AUTO
// label when no source info is available. Add/Remove shows whenever the row is
// editable (`!locked`), so in Wizard "book" mode an auto-granted spell shows
// both its badge and the spellbook toggle.
export function PickerSpellRow({ spell, selected, disabled, atLimit, autoGranted, locked, sourceInfo, sources, onToggle }) {
  return (
    <PickableSpellRow
      spell={spell}
      selected={selected}
      disabled={disabled}
      dimmed={atLimit}
      locked={locked}
      onToggle={onToggle}
      source={autoGranted ? (
        sourceInfo
          ? <SourceBadge sourceInfo={sourceInfo} sources={sources} />
          : <Box sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.md, color: UI_COLORS.success, flexShrink: 0 }}>AUTO</Box>
      ) : null}
    />
  );
}
