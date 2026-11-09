import { Box } from '@mui/material';
import { SourceBadge } from './SpellEntryParts.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import {
  SpellMiniTags,
  SpellReferenceBody,
  SpellRowLabel,
  SpellSelectButton,
} from '../../../shared/character/spells/SpellReference.jsx';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES } from '../../../shared/ui/fonts.js';

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
      containerSx={{ flexShrink: 0, border: 1, borderColor: selected ? UI_COLORS.success : 'transparent', borderRadius: 1, overflow: 'hidden', opacity: atLimit ? 0.5 : 1, '&:hover': { borderColor: selected ? UI_COLORS.success : 'divider' } }}
      bodySx={{ px: '9px', pt: '2px', pb: '8px' }}
      body={<SpellReferenceBody spell={spell} />}
      header={({ toggle }) => (
        <Box
          onClick={toggle}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: '9px', py: '6px', cursor: 'pointer', bgcolor: selected ? uiAlpha(UI_COLORS.successFlat, 0.08) : 'transparent', '&:hover': { bgcolor: selected ? uiAlpha(UI_COLORS.successFlat, 0.08) : UI_COLORS.headerBg } }}
        >
          <SpellRowLabel spell={spell} selected={selected} nameSx={{ fontSize: FONT_SIZES.xxl }} sx={{ gap: 0.4 }} />
          <SpellMiniTags spell={spell} sx={{ mx: 1 }} />
          {autoGranted ? (
            sourceInfo
              ? <SourceBadge sourceInfo={sourceInfo} sources={sources} />
              : <Box sx={{ fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.md, color: UI_COLORS.success, flexShrink: 0 }}>AUTO</Box>
          ) : null}
          {!locked ? (
            <SpellSelectButton selected={selected} disabled={disabled} onToggle={onToggle} addColor="success" />
          ) : null}
        </Box>
      )}
    />
  );
}
