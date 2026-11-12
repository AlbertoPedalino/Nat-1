import { Box, Typography } from '@mui/material';
import { levelHeaderSx, panelSurfaceSx } from './spellsTabStyles.js';
import { getPactSlotUsed, getRegularSlotUsed } from '../../../shared/character/spells/spellSlots.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

export function SpellSection({ title, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={levelHeaderSx}>{title}</Typography>
      <Box sx={{ display: 'grid', gap: 0.5, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

export function SlotPanel({ slots, used, created, onToggle, readOnly = false }) {
  const hasRegular = (slots.regular || []).some(Boolean);
  const hasPact = slots.pact && slots.pact.count > 0;
  if (!hasRegular && !hasPact) return null;
  return (
    <Box sx={panelSurfaceSx}>
      {hasRegular ? (
        <>
          <Typography sx={{ ...levelHeaderSx, color: UI_COLORS.accent, borderColor: uiAlpha(UI_COLORS.accent, OPACITY.fill) }}>Spell Slots</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
            {slots.regular.map((total, idx) => {
              const lv = idx + 1;
              const createdCount = Number((created || {})[lv] || 0);
              return total ? <SlotGroup key={lv} level={lv} total={total} used={getRegularSlotUsed(used, lv)} created={createdCount} onToggle={onToggle} readOnly={readOnly} /> : null;
            })}
          </Box>
        </>
      ) : null}
      {hasPact ? (
        <Box sx={{ mt: hasRegular ? 1 : 0 }}>
          <Typography sx={{ ...levelHeaderSx, color: UI_COLORS.spell, borderColor: uiAlpha(UI_COLORS.spell, OPACITY.shade) }}>Pact Slots ({slots.pact.count}x {slots.pact.level})</Typography>
          <SlotGroup
            level={slots.pact.level}
            total={slots.pact.count}
            used={getPactSlotUsed(used, slots.pact.level)}
            created={0}
            kind="pact"
            onToggle={onToggle}
            readOnly={readOnly}
          />
        </Box>
      ) : null}
    </Box>
  );
}

function SlotGroup({ level, total, used, created = 0, kind = 'regular', onToggle, readOnly = false }) {
  const dotCursor = readOnly ? 'default' : 'pointer';
  const dotHover = readOnly ? {} : { '&:hover': { borderColor: UI_COLORS.accentText } };
  return (
    <Box sx={{ minWidth: 42 }}>
      <Box sx={{ ...TEXT_STYLES.title, fontSize: FONT_SIZES.xxs, color: 'text.secondary', textAlign: 'center', mb: 0.5 }}>{level}</Box>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Array.from({ length: total }, (_, index) => (
          <Box
            key={index}
            onClick={readOnly ? undefined : () => onToggle(level, total, index, created, kind)}
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '1.5px solid',
              borderColor: index < used ? UI_COLORS.info : uiAlpha(UI_COLORS.textSecondary, OPACITY.line),
              bgcolor: index < used ? UI_COLORS.info : 'transparent',
              cursor: dotCursor,
              ...dotHover,
            }}
          />
        ))}
        {created > 0 ? (
          <Box
            onClick={readOnly ? undefined : () => onToggle(level, total, total, created, kind)}
            sx={{
              width: 14, height: 14, borderRadius: '50%', cursor: dotCursor,
              border: '1.5px dashed', borderColor: UI_COLORS.success,
              // Washed over the panel's paper, so the dot stays solid.
              ...tintedSurfaceSx(UI_COLORS.success),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...dotHover,
            }}
            title={`Temporary slot${created > 1 ? 's' : ''}: ${created}`}
          />
        ) : null}
      </Box>
      {created > 0 ? (
        <Box sx={{ ...TEXT_STYLES.title, fontSize: FONT_SIZES.xxxs, color: UI_COLORS.success, textAlign: 'center', mt: 0.25 }}>
          +{created}
        </Box>
      ) : null}
    </Box>
  );
}
