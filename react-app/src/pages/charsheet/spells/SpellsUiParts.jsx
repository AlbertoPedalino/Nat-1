import { Box, Typography } from '@mui/material';
import { levelHeaderSx, panelSurfaceSx, statBoxSx } from './spellsTabStyles.js';
import { getPactSlotUsed, getRegularSlotUsed } from '../../../shared/character/spells/spellSlots.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { emptyTextSx } from '../../../shared/ui/PanelHeader.jsx';

export function StatBox({ value, label }) {
  return (
    <Box sx={statBoxSx}>
      <Box sx={{ fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.body, fontWeight: 700, color: UI_COLORS.goldLight }}>{value}</Box>
      <Box sx={{ fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxs, letterSpacing: LETTER_SPACINGS.xl, color: 'text.secondary', textTransform: 'uppercase' }}>{label}</Box>
    </Box>
  );
}

export function Empty({ text }) {
  return (
    <Box sx={{ ...panelSurfaceSx, py: 0.9 }}>
      <Typography sx={emptyTextSx}>{text}</Typography>
    </Box>
  );
}

export function SpellSection({ title, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={levelHeaderSx}>{title}</Typography>
      <Box sx={{ display: 'grid', gap: '4px', minWidth: 0 }}>{children}</Box>
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
          <Typography sx={{ ...levelHeaderSx, color: UI_COLORS.gold, borderColor: uiAlpha(UI_COLORS.gold, 0.18) }}>Spell Slots</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.4 }}>
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
          <Typography sx={{ ...levelHeaderSx, color: UI_COLORS.purple, borderColor: uiAlpha(UI_COLORS.purple, 0.22) }}>Pact Slots ({slots.pact.count}x {slots.pact.level})</Typography>
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
  const dotHover = readOnly ? {} : { '&:hover': { borderColor: UI_COLORS.goldLight } };
  return (
    <Box sx={{ minWidth: 42 }}>
      <Box sx={{ fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxs, color: 'text.secondary', textAlign: 'center', mb: '3px', letterSpacing: LETTER_SPACINGS.lg }}>{level}</Box>
      <Box sx={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {Array.from({ length: total }, (_, index) => (
          <Box
            key={index}
            onClick={readOnly ? undefined : () => onToggle(level, total, index, created, kind)}
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '1.5px solid',
              borderColor: index < used ? UI_COLORS.blue : uiAlpha(UI_COLORS.textParchment, 0.28),
              bgcolor: index < used ? UI_COLORS.blue : 'transparent',
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
              bgcolor: uiAlpha(UI_COLORS.success, 0.12),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...dotHover,
            }}
            title={`Temporary slot${created > 1 ? 's' : ''}: ${created}`}
          />
        ) : null}
      </Box>
      {created > 0 ? (
        <Box sx={{ fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxxs, color: UI_COLORS.success, textAlign: 'center', mt: '2px', letterSpacing: LETTER_SPACINGS.sm }}>
          +{created}
        </Box>
      ) : null}
    </Box>
  );
}
