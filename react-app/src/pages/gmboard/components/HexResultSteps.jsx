import { Box, Stack, Typography, useTheme } from '@mui/material';
import { Coins, Dice5, Eye, Flame, Leaf, Lock, Map, Swords, CloudRain } from 'lucide-react';
import ResultBadge from './ResultBadge.jsx';

function formatLoot(loot) {
  const valueLine = [loot.valore, loot.extra].filter(Boolean).join(' ');
  return [loot.rarita, loot.qualita, valueLine].filter(Boolean).join(' · ');
}

function StepRow({ icon: Icon, iconColor, label, children, last }) {
  return (
    <Box sx={{ ...stepRowSx, borderBottom: last ? 'none' : '1px solid', borderColor: 'divider' }}>
      <Box sx={stepIconColSx}>
        <Icon size={15} color={iconColor} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {label ? <Typography sx={microLabelSx}>{label}</Typography> : null}
        <Typography sx={lineSx}>{children}</Typography>
      </Box>
    </Box>
  );
}

function renderStep(step, index, tones, last) {
  switch (step.kind) {
    case 'weatherChange':
      return (
        <StepRow key={index} icon={CloudRain} iconColor={tones.weather} label="Weather" last={last}>
          Shifts to <strong>{step.meteo}{step.intensity ? ` (${step.intensity})` : ''}</strong> [d20={step.d20}] — next check in {step.nextWeatherIn}h
        </StepRow>
      );
    case 'popRoll':
      return (
        <StepRow key={index} icon={Dice5} iconColor={tones.dim} label="Population Roll" last={last}>
          d6={step.d6} vs threshold {step.threshold} — {step.triggered ? 'event triggered' : 'no event'}
        </StepRow>
      );
    case 'none':
      return (
        <StepRow key={index} icon={Leaf} iconColor={tones.result.none} label="Result" last={last}>
          No event this leg.
        </StepRow>
      );
    case 'event':
      return (
        <StepRow key={index} icon={Map} iconColor={tones.result.trigger} label="Event" last={last}>
          (d20+d20={step.sum}): <strong>{step.name}</strong>
        </StepRow>
      );
    case 'encounter':
      return (
        <StepRow key={index} icon={Swords} iconColor={tones.result.encounter} label={step.label} last={last}>
          (d20+d20={step.sum}): <ResultBadge tone={tones.difficulty[step.data.diff] || tones.fallback}>{step.data.diff}</ResultBadge>{' '}
          Level {step.data.lv} · {Number(step.data.xp).toLocaleString()} XP/PC
        </StepRow>
      );
    case 'loot':
    case 'campLoot':
      return (
        <StepRow key={index} icon={Coins} iconColor={tones.result.loot} label="Loot" last={last}>
          (d8+d12={step.sum}): <ResultBadge tone={tones.rarity[step.data.rarita] || tones.fallback}>{step.data.tipo}</ResultBadge>{' '}
          {step.data.rarita !== '—' ? formatLoot(step.data) : ''}
        </StepRow>
      );
    case 'lootDc':
    case 'campLootDc':
      return (
        <StepRow key={index} icon={Lock} iconColor={tones.dim} label="Loot Recovery" last={last}>
          DC {step.sum} (d8+d12){step.disadvantage ? ' — Weather Disadvantage' : ''}
        </StepRow>
      );
    case 'campSpotDc':
      return (
        <StepRow key={index} icon={Eye} iconColor={tones.dim} label="Spot Camp" last={last}>
          DC {step.sum} (d8+d12){step.disadvantage ? ' — Weather Disadvantage' : ''}
        </StepRow>
      );
    case 'trapDetectDc':
      return (
        <StepRow key={index} icon={Eye} iconColor={tones.dim} label="Detect" last={last}>
          DC {step.sum} (d8+d12){step.disadvantage ? ' — Weather Disadvantage' : ''}
        </StepRow>
      );
    case 'trap':
      return (
        <StepRow key={index} icon={Flame} iconColor={tones.result.trap} label="Trap" last={last}>
          (d8+d12={step.sum}): <strong>{step.data.tipo}</strong> Level {step.data.lv} · DC {step.data.dc} · {step.data.danno}
        </StepRow>
      );
    case 'genericDc':
      return (
        <StepRow key={index} icon={Lock} iconColor={tones.dim} label="DC" last={last}>
          {step.sum} (d8+d12){step.disadvantage ? ' — Weather Disadvantage' : ''}
        </StepRow>
      );
    default:
      return null;
  }
}

export default function HexResultSteps({ result }) {
  const theme = useTheme();
  if (!result || !result.steps.length) return null;
  const tones = {
    difficulty: theme.palette.gmboard.difficulty,
    rarity: theme.palette.gmboard.rarity,
    fallback: theme.palette.gmboard.rarity.Common,
    weather: theme.palette.gmboard.weather[result.steps.find((s) => s.kind === 'weatherChange')?.meteo] || theme.palette.gmboard.weather.Clear,
    result: theme.palette.gmboard.result,
    dim: theme.palette.text.secondary,
  };

  return (
    <Box sx={{ ...boxSx, bgcolor: theme.palette.gmboard.panelOverlay }}>
      <Typography sx={headerSx}>Hex Result</Typography>
      <Stack spacing={0}>
        {result.steps.map((step, index) => renderStep(step, index, tones, index === result.steps.length - 1))}
      </Stack>
    </Box>
  );
}

const boxSx = {
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
};

const headerSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.72rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'primary.main',
  mb: 0.75,
};

const stepRowSx = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 0.9,
  py: 0.6,
};

const stepIconColSx = {
  display: 'flex',
  alignItems: 'center',
  pt: 0.15,
  flexShrink: 0,
};

const microLabelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.6rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  lineHeight: 1.4,
};

const lineSx = {
  fontSize: '0.8rem',
  color: 'text.primary',
};
