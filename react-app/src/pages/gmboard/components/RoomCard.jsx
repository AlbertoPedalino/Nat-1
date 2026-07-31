import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { Castle, Coins, Flame, Leaf, Lock, Minus, ShieldCheck, Swords } from 'lucide-react';
import ResultBadge from './ResultBadge.jsx';

function formatLoot(loot) {
  const valueLine = [loot.valore, loot.extra].filter(Boolean).join(' ');
  return [loot.rarita, loot.qualita, valueLine].filter(Boolean).join(' · ');
}

const SLOT_ICON = { Encounter: Swords, 'Environment Damage': Flame, Environment: Leaf, None: Minus };

function slotTone(result, type) {
  if (type === 'Encounter') return result.encounter;
  if (type === 'Environment Damage') return result.trap;
  if (type === 'Environment') return result.environment;
  return result.none;
}

function SlotBlock({ slot, tones }) {
  const tone = slotTone(tones.result, slot.type);
  const Icon = SLOT_ICON[slot.type] || Minus;
  return (
    <Box sx={{ ...slotSx, borderLeftColor: tone, bgcolor: alpha(tone, 0.08) }}>
      <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap">
        <Icon size={13} color={tone} />
        <Typography sx={microLabelSx}>Roll {slot.n}/{slot.thr}</Typography>
        <ResultBadge tone={tone}>{slot.type}</ResultBadge>
        <Typography sx={detailSx}>d8({slot.d8})+d12({slot.d12})={slot.sum}</Typography>
      </Stack>
      {slot.extra?.kind === 'enc' ? (
        <Typography sx={lineSx}>
          <ResultBadge tone={tones.difficulty[slot.extra.data.diff] || tones.fallback}>{slot.extra.data.diff}</ResultBadge>{' '}
          Lv {slot.extra.data.lv} · {Number(slot.extra.data.xp).toLocaleString()} XP/PC
        </Typography>
      ) : null}
      {slot.extra?.kind === 'trap' ? (
        <Typography sx={lineSx}>{slot.extra.data.tipo} Lv {slot.extra.data.lv} · DC {slot.extra.data.dc} · {slot.extra.data.danno}</Typography>
      ) : null}
      {slot.extra?.kind === 'env' ? (
        <Typography sx={lineSx}>Severity: {slot.extra.data.gravita}</Typography>
      ) : null}
    </Box>
  );
}

export default function RoomCard({ room }) {
  const theme = useTheme();
  const tones = {
    difficulty: theme.palette.gmboard.difficulty,
    rarity: theme.palette.gmboard.rarity,
    result: theme.palette.gmboard.result,
    fallback: theme.palette.gmboard.rarity.Common,
  };
  const isSafe = room.slots.every((slot) => slot.type === 'None');
  const lootTone = tones.rarity[room.loot.data.rarita] || tones.fallback;

  return (
    <Box sx={cardSx}>
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        flexWrap="wrap"
        sx={{ ...headerBandSx, bgcolor: theme.palette.gmboard.headerOverlay }}
      >
        <Castle size={13} color={theme.palette.primary.main} />
        <Typography sx={roomChipSx}>ROOM {room.index}</Typography>
        <ResultBadge tone={theme.palette.text.secondary}>{room.popLabel} · {room.thr} {room.thr > 1 ? 'rolls' : 'roll'}</ResultBadge>
        {isSafe ? (
          <ResultBadge tone={theme.palette.gmboard.result.safe} icon={ShieldCheck}>Safe room</ResultBadge>
        ) : null}
      </Stack>
      <Stack spacing={0.75} sx={{ p: 1.25 }}>
        {room.slots.map((slot) => <SlotBlock key={slot.n} slot={slot} tones={tones} />)}
        <Box sx={{ ...slotSx, borderLeftColor: lootTone, bgcolor: alpha(lootTone, 0.08) }}>
          <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap">
            <Coins size={13} color={lootTone} />
            <Typography sx={microLabelSx}>Loot</Typography>
            <ResultBadge tone={lootTone}>{room.loot.data.tipo}</ResultBadge>
            <Typography sx={detailSx}>d8({room.loot.d8})+d12({room.loot.d12})={room.loot.sum}</Typography>
          </Stack>
          {room.loot.data.rarita !== '—' ? <Typography sx={lineSx}>{formatLoot(room.loot.data)}</Typography> : null}
          {room.lootDc ? (
            <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.3 }}>
              <Lock size={11} color={theme.palette.text.secondary} />
              <Typography sx={dcSx}>DC to find it: {room.lootDc.sum}</Typography>
            </Stack>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}

const cardSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  overflow: 'hidden',
};

const headerBandSx = {
  px: 1.25,
  py: 0.75,
  borderBottom: '1px solid',
  borderColor: 'divider',
};

const roomChipSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.78rem',
  letterSpacing: '0.04em',
  color: 'primary.main',
};

const slotSx = {
  p: 0.75,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  borderLeftWidth: 3,
};

const microLabelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.6rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

const detailSx = {
  fontSize: '0.68rem',
  color: 'text.secondary',
};

const lineSx = {
  fontSize: '0.76rem',
  color: 'text.primary',
  mt: 0.3,
};

const dcSx = {
  fontSize: '0.7rem',
  color: 'text.secondary',
  fontStyle: 'italic',
};
