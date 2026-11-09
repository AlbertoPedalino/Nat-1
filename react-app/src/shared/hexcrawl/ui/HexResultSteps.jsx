import { Box, Stack, Typography, useTheme } from '@mui/material';
import { Coins, Dice5, Eye, Flame, Leaf, Lock, Map, Swords, CloudRain } from 'lucide-react';
import ResultBadge from '../../gmboard/ui/ResultBadge.jsx';
import { FONT_SIZES, LINE_HEIGHTS } from '../../ui/fonts.js';
import { weatherTone } from '../../gmboard/weather.js';
import { encounterDetail, lootDetail } from '../../gmboard/resultText.js';
import { boardTone } from '../../gmboard/ui/resultVisuals.js';
import { microLabelSx } from '../../ui/PanelHeader.jsx';
import { boardInsetSx } from '../../gmboard/ui/surfaces.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';

function StepRow({ icon: Icon, iconColor, label, children, last }) {
  return (
    <Box sx={{ ...stepRowSx, borderBottom: last ? 'none' : '1px solid', borderColor: 'divider' }}>
      <Box sx={stepIconColSx}>
        <Icon size={ICON_SIZES.sm} color={iconColor} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {label ? <Typography sx={stepLabelSx}>{label}</Typography> : null}
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
          Shifts to <strong>{step.weather}{step.intensity ? ` (${step.intensity})` : ''}</strong> [d20={step.d20}] — next check in {step.nextWeatherIn}h
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
          (d20+d20={step.sum}): <ResultBadge tone={tones.of('difficulty', step.data.diff)}>{step.data.diff}</ResultBadge>{' '}
          {encounterDetail(step.data)}
        </StepRow>
      );
    case 'loot':
    case 'campLoot':
      return (
        <StepRow key={index} icon={Coins} iconColor={tones.result.loot} label="Loot" last={last}>
          (d8+d12={step.sum}): <ResultBadge tone={tones.of('rarity', step.data.rarity)}>{step.data.type}</ResultBadge>{' '}
          {lootDetail(step.data)}
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
    case 'trap':
      return (
        <StepRow key={index} icon={Flame} iconColor={tones.result.trap} label="Trap" last={last}>
          (d8+d12={step.sum}): <strong>{step.data.type}</strong> Level {step.data.lv} · DC {step.data.dc} (detect & disarm) · {step.data.damage}
          {step.disadvantage ? ' — Weather Disadvantage' : ''}
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
    of: (group, key) => boardTone(theme.palette, group, key),
    weather: weatherTone(theme.palette, result.steps.find((s) => s.kind === 'weatherChange')?.weather),
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

const boxSx = { ...boardInsetSx, p: 1.5 };

const headerSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.md,
  color: 'primary.main',
  mb: 0.75,
};

const stepRowSx = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1,
  py: 0.5,
};

const stepIconColSx = {
  display: 'flex',
  alignItems: 'center',
  pt: 0.25,
  flexShrink: 0,
};

const stepLabelSx = { ...microLabelSx, lineHeight: LINE_HEIGHTS.normal };

const lineSx = {
  fontSize: FONT_SIZES.xl,
  color: 'text.primary',
};
