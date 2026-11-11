import { Chip, Typography } from '@mui/material';
import { chipTintStyle, damageTypeTone, PANEL_TONES } from '../../../shared/ui/entityColors.js';
import { emptyTextSx } from '../../../shared/ui/PanelHeader.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import Panel from '../../../shared/ui/Panel.jsx';

// The "Defenses" box: one chip per defense `{ kind, type, source? }`, kind being
// 'Resist', 'Immune', 'Cond. Immune', 'Adv', 'Trait'… Resistances and
// immunities wear their damage type's hue, an immunity the fuller tint; the
// rest stay neutral. Used by the character's header and by creature panels
// (the Eldritch Cannon), so both read the same.
export default function DefensesPanel({ items = [], emptyText = 'No resistances detected.', sx }) {
  return (
    <Panel icon={GAME_ICONS.defenses} title="Defenses" tone={PANEL_TONES.defenses} sx={sx} bodySx={{ p: '0.4rem 0.62rem' }}>
      {items.length === 0 && <Typography sx={emptyTextSx}>{emptyText}</Typography>}
      {items.map((d, i) => {
        const tone = d.kind === 'Resist' || d.kind === 'Immune' ? damageTypeTone(d.type) : null;
        const tint = tone ? chipTintStyle(tone, { bgAlpha: d.kind === 'Immune' ? OPACITY.line : OPACITY.tint }) : null;
        return (
          <Chip
            key={`${d.kind}-${d.type}-${i}`}
            size="small"
            label={`${d.kind} ${d.type}${d.source ? ` · ${d.source}` : ''}`}
            variant="outlined"
            sx={{ fontSize: FONT_SIZES.xxxs, m: 0.25, ...tint }}
          />
        );
      })}
    </Panel>
  );
}


