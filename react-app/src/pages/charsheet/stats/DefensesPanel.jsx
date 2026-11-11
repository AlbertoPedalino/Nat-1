import { Chip, Typography } from '@mui/material';
import { damageTypeTone, PANEL_TONES, stickerChipSx } from '../../../shared/ui/entityColors.js';
import { emptyTextSx } from '../../../shared/ui/PanelHeader.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import Panel from '../../../shared/ui/Panel.jsx';

// The "Defenses" box: one chip per defense `{ kind, type, source? }`, kind being
// 'Resist', 'Immune', 'Cond. Immune', 'Adv', 'Trait'… Resistances and
// immunities are stickers in their damage type's hue, an immunity filled solid;
// the rest are neutral stickers. Used by the character's header and by creature panels
// (the Eldritch Cannon), so both read the same.
export default function DefensesPanel({ items = [], emptyText = 'No resistances detected.', sx }) {
  return (
    <Panel icon={GAME_ICONS.defenses} title="Defenses" tone={PANEL_TONES.defenses} sx={sx} bodySx={{ p: '0.4rem 0.62rem' }}>
      {items.length === 0 && <Typography sx={emptyTextSx}>{emptyText}</Typography>}
      {items.map((d, i) => {
        const tone = d.kind === 'Resist' || d.kind === 'Immune' ? damageTypeTone(d.type) : null;
        return (
          <Chip
            key={`${d.kind}-${d.type}-${i}`}
            size="small"
            label={`${d.kind} ${d.type}${d.source ? ` · ${d.source}` : ''}`}
            sx={{ m: 0.25, ...stickerChipSx(tone, { filled: d.kind === 'Immune' }) }}
          />
        );
      })}
    </Panel>
  );
}


