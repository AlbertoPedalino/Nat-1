import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { Coins, Compass, Minus, ScrollText, Swords, Tent } from 'lucide-react';
import ResultBadge from './ResultBadge.jsx';

function formatLoot(loot) {
  const valueLine = [loot.valore, loot.extra].filter(Boolean).join(' ');
  return [loot.rarita, loot.qualita, valueLine].filter(Boolean).join(' · ');
}

function eventVisual(result, type) {
  if (type === 'encounter') return { Icon: Swords, tone: result.encounter };
  if (type === 'loot') return { Icon: Coins, tone: result.loot };
  if (type === 'camp_nemico') return { Icon: Tent, tone: result.camp };
  if (type === 'nothing') return { Icon: Minus, tone: result.none };
  return { Icon: Compass, tone: result.trigger };
}

export default function QuestCard({ quest }) {
  const theme = useTheme();
  const difficultyTone = theme.palette.gmboard.difficulty;
  const rarityTone = theme.palette.gmboard.rarity;
  const fallback = rarityTone.Common;
  const encounterTone = theme.palette.gmboard.result.encounter;
  const { Icon: EventIcon, tone: eventTone } = eventVisual(theme.palette.gmboard.result, quest.event.type);
  const rewardTone = rarityTone[quest.reward.data.rarita] || fallback;

  return (
    <Box sx={cardSx}>
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        flexWrap="wrap"
        sx={{ ...headerBandSx, bgcolor: theme.palette.gmboard.headerOverlay }}
      >
        <ScrollText size={13} color={theme.palette.primary.main} />
        <Typography sx={questChipSx}>QUEST {quest.index}</Typography>
        <ResultBadge tone={eventTone} icon={EventIcon}>{quest.event.name}</ResultBadge>
      </Stack>
      <Stack spacing={0.75} sx={{ p: 1.25 }}>
        <Box sx={{ ...slotSx, borderLeftColor: eventTone, bgcolor: alpha(eventTone, 0.08) }}>
          <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap">
            <EventIcon size={13} color={eventTone} />
            <Typography sx={microLabelSx}>Event Hook</Typography>
            <Typography sx={detailSx}>d20({quest.event.d1})+d20({quest.event.d2})={quest.event.sum}</Typography>
          </Stack>
        </Box>
        {quest.encounter ? (
          <Box sx={{ ...slotSx, borderLeftColor: encounterTone, bgcolor: alpha(encounterTone, 0.08) }}>
            <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap">
              <Swords size={13} color={encounterTone} />
              <Typography sx={microLabelSx}>Encounter</Typography>
              <ResultBadge tone={difficultyTone[quest.encounter.data.diff] || fallback}>{quest.encounter.data.diff}</ResultBadge>
              <Typography sx={detailSx}>d20({quest.encounter.d1})+d20({quest.encounter.d2})={quest.encounter.sum}</Typography>
            </Stack>
            <Typography sx={lineSx}>Lv {quest.encounter.data.lv} · {Number(quest.encounter.data.xp).toLocaleString()} XP/PC</Typography>
          </Box>
        ) : null}
        <Box sx={{ ...slotSx, borderLeftColor: rewardTone, bgcolor: alpha(rewardTone, 0.08) }}>
          <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap">
            <Coins size={13} color={rewardTone} />
            <Typography sx={microLabelSx}>Reward</Typography>
            <ResultBadge tone={rewardTone}>{quest.reward.data.tipo}</ResultBadge>
            {quest.reward.isMinimum ? <ResultBadge tone={theme.palette.warning.main}>MINIMUM</ResultBadge> : null}
            <Typography sx={detailSx}>d8({quest.reward.d8})+d12({quest.reward.d12})={quest.reward.sum}</Typography>
          </Stack>
          {quest.reward.data.rarita !== '—' ? <Typography sx={lineSx}>{formatLoot(quest.reward.data)}</Typography> : null}
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

const questChipSx = {
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
