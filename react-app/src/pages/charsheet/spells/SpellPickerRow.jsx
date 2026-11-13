import { Box } from '@mui/material';
import { SourceBadge } from './SpellEntryParts.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import {
  SpellMiniTags,
  SpellReferenceBody,
  SpellRowLabel,
  SpellSelectButton,
} from '../../../shared/character/spells/SpellReference.jsx';
import { UI_COLORS, OPACITY } from '../../../shared/ui/colors.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { CARD_SX } from '../../../shared/ui/interactive.js';

// One spell in the sheet's spell picker, with its add/remove control.

// Picker row for the Add/Remove + Wizard Spellbook dialog. Tapping the row
// expands the full rich reference (meta + description + upcast). An auto-granted
// spell always shows its tinted source chip (class/subclass/feat/etc., the same
// badge used on the sheet spell rows), falling back to a plain AUTO label when no
// source info is available. The Add/Remove button shows whenever the row is
// editable (`!locked`) — so in Wizard "book" mode an auto-granted spell shows both
// its badge and the spellbook toggle. The caret is a decorative indicator.
export function PickerSpellRow({ spell, selected, disabled, atLimit, autoGranted, locked, sourceInfo, sources, onToggle }) {
  return (
    <ExpandableCard
      containerSx={{ ...CARD_SX, flexShrink: 0, overflow: 'hidden', opacity: atLimit ? OPACITY.strong : 1, ...(selected ? { borderColor: UI_COLORS.success, '&:hover': { borderColor: UI_COLORS.success } } : null) }}
      detailsSx={{ px: 1.25, pt: 0.25, pb: 1 }}
      details={<SpellReferenceBody spell={spell} />}
      summary={({ toggle }) => (
        <Box
          onClick={toggle}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.75, cursor: 'pointer', ...(selected ? tintedSurfaceSx(UI_COLORS.success, { amount: OPACITY.soft }) : { bgcolor: 'transparent' }) }}
        >
          <SpellRowLabel
            spell={spell}
            selected={selected}
            nameSx={{ fontSize: FONT_SIZES.xxl }}
            source={autoGranted ? (
              sourceInfo
                ? <SourceBadge sourceInfo={sourceInfo} sources={sources} />
                : <Box sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.md, color: UI_COLORS.success, flexShrink: 0 }}>AUTO</Box>
            ) : null}
          />
          <SpellMiniTags spell={spell} sx={{ mx: 1 }} />
          {!locked ? (
            <SpellSelectButton selected={selected} disabled={disabled} onToggle={onToggle} addColor="success" />
          ) : null}
        </Box>
      )}
    />
  );
}
