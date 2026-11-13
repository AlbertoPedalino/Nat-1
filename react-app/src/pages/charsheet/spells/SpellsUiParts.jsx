import { Box, Typography } from '@mui/material';
import { levelHeaderSx, panelSurfaceSx } from './spellsTabStyles.js';
import { getPactSlotUsed, getRegularSlotUsed } from '../../../shared/character/spells/spellSlots.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import GemPip from '../../../shared/ui/GemPip.jsx';

export function SpellSection({ title, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={levelHeaderSx}>{title}</Typography>
      <Box sx={{ display: 'grid', gap: 0.5, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

export function SlotPanel({ slots, used, created, onToggle, readOnly = false }) {
  // A level shows when it has slots of its own or temporary ones (Font of
  // Magic, Wild Resurgence, a transmuted magic item).
  const createdAt = (lv) => Number((created || {})[lv] || 0);
  const hasRegular = (slots.regular || []).some((total, idx) => total || createdAt(idx + 1));
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
              const createdCount = createdAt(lv);
              return total || createdCount ? <SlotGroup key={lv} level={lv} total={total} used={getRegularSlotUsed(used, lv)} created={createdCount} onToggle={onToggle} readOnly={readOnly} /> : null;
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

// A level's slots as gems (GemPip): the lit ones first, the spent settings
// after. A lit gem spends one slot, a setting recovers one (toggleSlot takes
// the index that does it). Each temporary slot (created) is one more gem, in
// its own colour, after them; using one spends it (they last until a Long Rest).
function SlotGroup({ level, total, used, created = 0, kind = 'regular', onToggle, readOnly = false }) {
  const toggle = (index) => (readOnly ? undefined : () => onToggle(level, total, index, created, kind));
  const name = kind === 'pact' ? 'Pact slot' : `Level ${level} slot`;
  return (
    <Box sx={{ minWidth: 42 }}>
      {/* The level in the figures' face: a number, read at a glance. */}
      <Box sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xxl, color: 'text.secondary', textAlign: 'center', lineHeight: LINE_HEIGHTS.none, mb: 0.5 }}>{level}</Box>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Array.from({ length: total }, (_, position) => {
          const available = position < total - used;
          return (
            <GemPip
              key={position}
              kind={kind === 'pact' ? 'pact' : 'slot'}
              available={available}
              aria-label={`${name}: ${available ? 'spend' : 'recover'}`}
              title={available ? 'Available' : 'Used'}
              onClick={toggle(available ? used : used - 1)}
            />
          );
        })}
        {Array.from({ length: created }, (_, index) => (
          <GemPip
            key={`temporary-${index}`}
            kind="temporary"
            available
            aria-label={`${name}: use a temporary slot`}
            title="Temporary slot, until a Long Rest"
            onClick={toggle(total)}
          />
        ))}
      </Box>
    </Box>
  );
}
