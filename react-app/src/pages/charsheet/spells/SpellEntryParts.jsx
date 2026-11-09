import {
  alpha,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import PipButton from '../../../shared/ui/PipButton.jsx';
import { RICH_TEXT_ACCENT } from '../../../shared/ui/entityColors.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { inlineMetaLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

// Pieces of a spell row: its source badge, free-cast pips and the weapon
// picker for spells cast through a weapon.

// Source badge for a spell row. When the same spell is granted by more than
// one source (e.g. a Forest Gnome Druid's Speak with Animals), the row stays
// consolidated to a single badge showing the primary source plus a `+N`
// indicator, with all contributing sources listed in a tooltip.
export function SourceBadge({ sourceInfo, sources, suffix = '' }) {
  if (!sourceInfo) return null;
  const all = (sources && sources.length ? sources : [sourceInfo]).filter(Boolean);
  const extra = all.length - 1;
  const label = sourceInfo.label + suffix + (extra > 0 ? ` +${extra}` : '');
  const tone = sourceInfo.color || UI_COLORS.spell;
  const badge = <MiniBadge label={label} color={tone} bg={alpha(tone, 0.16)} />;
  if (extra <= 0) return badge;
  const title = 'Sources: ' + all.map((s) => s.originLabel || s.label).filter(Boolean).join(', ');
  return <Tooltip title={title} arrow><Box component="span" sx={{ display: 'inline-flex' }}>{badge}</Box></Tooltip>;
}

export function FreeCastsInline({ freeCasts, freeCastUses, onToggleFreeCast, sx }) {
  if (!Array.isArray(freeCasts) || !freeCasts.length) return null;
  const interactive = typeof onToggleFreeCast === 'function';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', mt: 0.35, px: '7px', py: '4px', border: 1, borderColor: uiAlpha(UI_COLORS.accent, 0.28), borderRadius: 0.625, bgcolor: uiAlpha(UI_COLORS.accent, 0.06), ...(sx || {}) }}>
      <Typography sx={{ ...inlineMetaLabelSx, mr: 0.25 }}>
        Free Cast
      </Typography>
        {freeCasts.map((fc) => {
          const used = Math.max(0, Number(freeCastUses?.[fc.id] || 0));
          const max = Math.max(1, Number(fc.max) || 1);
          return (
            <Box key={fc.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.55, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.1 }}>
                {fc.label}
              </Typography>
              <Box sx={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                {Array.from({ length: max }).map((_, i) => {
                  const isUsed = i < used;
                  return (
                    <PipButton
                      key={`${fc.id}-dot-${i}`}
                      size={10}
                      round
                      title={isUsed ? 'Free cast used' : 'Free cast available'}
                      aria-label={`${fc.label}: ${isUsed ? 'free cast used' : 'free cast available'}`}
                      onClick={interactive ? (e) => { e.stopPropagation(); onToggleFreeCast(fc); } : undefined}
                      sx={{
                        border: '1.5px solid',
                        borderColor: isUsed ? UI_COLORS.accentText : uiAlpha(UI_COLORS.accent, 0.35),
                        bgcolor: isUsed ? UI_COLORS.accent : 'transparent',
                        '&:hover:not(:disabled)': interactive ? { borderColor: UI_COLORS.accentText, boxShadow: `0 0 0 2px ${uiAlpha(UI_COLORS.accent, 0.22)}` } : undefined,
                      }}
                    />
                  );
                })}
              </Box>
              <Typography variant="caption" sx={{ lineHeight: 1.1, color: used >= max ? UI_COLORS.dangerDeep : 'text.secondary' }}>
                {fc.rechargeLabel}
                {fc.canAlsoUseSlots === false ? ' · free only' : ' · also slots'}
                {used >= max ? ' · spent' : ''}
              </Typography>
            </Box>
          );
        })}
    </Box>
  );
}

// The weapon a spell attacks through (True Strike). Stored per spell on the
// character, so the collapsed card keeps rolling the one picked.
export function SpellWeaponPicker({ spellName, options, selectedKey, onUpdateCharacter }) {
  if (!options.length) {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.7 }}>
        No weapon you are proficient with in your inventory.
      </Typography>
    );
  }
  return (
    <Box sx={{ mt: 0.7, pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: FONT_SIZES.xs, color: RICH_TEXT_ACCENT, ...TEXT_STYLES.title, mb: 0.3 }}>
        Weapon
      </Typography>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={selectedKey}
        onChange={(_, next) => {
          if (!next || next === selectedKey) return;
          onUpdateCharacter?.((prev) => ({
            ...prev,
            spellWeapons: { ...(prev?.spellWeapons || {}), [spellName]: next },
          }));
        }}
        sx={{
          flexWrap: 'wrap',
          gap: '3px',
          '& .MuiToggleButton-root': {
            fontSize: FONT_SIZES.sm,
            px: '8px',
            py: '3px',
            border: 1,
            borderRadius: '999px !important',
            '&:not(.Mui-selected)': { borderColor: 'divider', color: 'text.secondary', bgcolor: 'transparent' },
          },
        }}
      >
        {options.map((option) => (
          <ToggleButton key={option.key} value={option.key}>{option.name}</ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
