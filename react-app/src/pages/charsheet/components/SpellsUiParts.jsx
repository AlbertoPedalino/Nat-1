import { Box, Typography } from '@mui/material';
import { levelHeaderSx, panelSurfaceSx, statBoxSx } from './spellsTabStyles.js';
import { getPactSlotUsed, getRegularSlotUsed } from '../../../shared/character/spellSlots.js';

export function StatBox({ value, label }) {
  return (
    <Box sx={statBoxSx}>
      <Box sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '1rem', fontWeight: 700, color: '#edd48a' }}>{value}</Box>
      <Box sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', letterSpacing: '0.1em', color: 'text.secondary', textTransform: 'uppercase' }}>{label}</Box>
    </Box>
  );
}

export function Empty({ text }) {
  return (
    <Box sx={{ ...panelSurfaceSx, py: 0.9 }}>
      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontStyle: 'italic' }}>{text}</Typography>
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
          <Typography sx={{ ...levelHeaderSx, color: '#caa550', borderColor: 'rgba(202,165,80,0.18)' }}>Spell Slots</Typography>
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
          <Typography sx={{ ...levelHeaderSx, color: '#9d7fb8', borderColor: 'rgba(157,127,184,0.22)' }}>Pact Slots ({slots.pact.count}x {slots.pact.level})</Typography>
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
  const dotHover = readOnly ? {} : { '&:hover': { borderColor: '#edd48a' } };
  return (
    <Box sx={{ minWidth: 42 }}>
      <Box sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', color: 'text.secondary', textAlign: 'center', mb: '3px', letterSpacing: '0.08em' }}>{level}</Box>
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
              borderColor: index < used ? '#4d95d6' : 'rgba(196,179,147,0.28)',
              bgcolor: index < used ? '#4d95d6' : 'transparent',
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
              border: '1.5px dashed', borderColor: '#58b879',
              bgcolor: 'rgba(88,184,121,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...dotHover,
            }}
            title={`Temporary slot${created > 1 ? 's' : ''}: ${created}`}
          />
        ) : null}
      </Box>
      {created > 0 ? (
        <Box sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', color: '#58b879', textAlign: 'center', mt: '2px', letterSpacing: '0.04em' }}>
          +{created}
        </Box>
      ) : null}
    </Box>
  );
}
