import { Box, Stack, Typography, useTheme } from '@mui/material';
import { Castle, Map, ScrollText, Table as TableIcon } from 'lucide-react';

function StepMarker({ n }) {
  return <Box component="span" sx={stepMarkerSx}>{n}</Box>;
}

function GuideCard({ title, icon: Icon, children }) {
  const theme = useTheme();
  return (
    <Box sx={cardSx}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
        {Icon ? <Icon size={15} color={theme.palette.primary.main} /> : null}
        <Typography sx={cardTitleSx}>{title}</Typography>
      </Stack>
      <Stack spacing={0.75}>{children}</Stack>
    </Box>
  );
}

function GuideRow({ step, children }) {
  return (
    <Box sx={rowWrapSx}>
      {step ? <StepMarker n={step} /> : null}
      <Typography sx={rowSx}>{children}</Typography>
    </Box>
  );
}

function Kw({ children }) {
  const theme = useTheme();
  return (
    <Box component="code" sx={{ ...kwSx, bgcolor: theme.palette.gmboard.panelOverlay }}>
      {children}
    </Box>
  );
}

export default function GuideView() {
  return (
    <Stack spacing={2}>
      <GuideCard title="HEXcrawl — Full Flow" icon={Map}>
        <GuideRow>
          For each hex explored press <strong>Proceed</strong>. Time moves forward, weather is checked if
          needed, then the roll sequence begins. Use <strong>Advance Only</strong> to move time without any
          rolls.
        </GuideRow>
        <GuideRow step={1}>Setup — Season (Spring/Summer/Autumn/Winter) drives random weather thresholds. Weather
          Override forces the current weather. Population (Unexplored/Frontier/Settled) sets the event
          trigger threshold. Terrain (Road/Plains/Forest/Mountain) sets base travel hours. Encounter Tier
          (T1–T4) selects the encounter table.</GuideRow>
        <GuideRow step={2}>Weather check — rolled automatically every 1d6+2 travel hours. Rain Heavy and Snow
          Moderate/Heavy impose disadvantage on Perception/Investigation. Snow doubles travel time at
          Light/Moderate and quadruples it at Heavy; Rain doubles it at Moderate/Heavy. Seasonal thresholds
          are editable under Tables → Seasonal Weather.</GuideRow>
        <GuideRow step={3}>Population roll — 1d6 vs threshold (Unexplored ≤1, Frontier ≤2, Settled ≤3) decides
          whether an event occurs this leg.</GuideRow>
        <GuideRow step={4}>Event table — 2d20. Encounter results roll 2d20 on the tier Encounter Table. Loot results
          roll 1d8+1d12 for the item, then a second 1d8+1d12 for the recovery DC. Enemy Camp rolls a spot DC,
          then a 2d20 encounter, then loot. Env. Damage/Trap rolls a detection DC, then 1d8+1d12 on the tier
          Trap Table. Every other event is a raw 1d8+1d12 DC to interact.</GuideRow>
      </GuideCard>

      <GuideCard title="Dungeon Explorer — Full Flow" icon={Castle}>
        <GuideRow>Set the room count (1–40), population mode, and tier, then press <strong>Generate</strong>.
          All rooms are resolved at once and stored as-is — reopening the board never rerolls them.</GuideRow>
        <GuideRow>Population mode sets complication rolls per room: Random rolls 1–3 per room; Unexplored is
          1 fixed roll; Frontier is 2; Settled is 3.</GuideRow>
        <GuideRow>Each complication rolls 1d8+1d12 on the Complication Table. Encounter rolls 2d20 on the tier
          Encounter Table. Environment Damage rolls 1d8+1d12 on the tier Trap Table. Environment rolls
          1d8+1d12 on the Environment Severity Table. None has no further roll.</GuideRow>
        <GuideRow>Each room also rolls loot once (1d8+1d12). Results of 8–14 find nothing; any other result
          rolls a second 1d8+1d12 for the recovery DC.</GuideRow>
      </GuideCard>

      <GuideCard title="Quest Generator — Full Flow" icon={ScrollText}>
        <GuideRow>Pick a scope (Random/Small/Medium/Large) and tier, then press <strong>Generate</strong>.
          Scope sets how many d8s are rolled to determine quest count: Random rolls 1–3 dice, Small rolls 1,
          Medium rolls 2, Large rolls 3 — the count is the highest die result.</GuideRow>
        <GuideRow>Each quest rolls 2d20 on the Event Table for its hook. Encounter and Enemy Camp events also
          roll 2d20 on the tier Encounter Table. Every quest rolls 1d8+1d12 for its reward on the Loot Table;
          if that roll finds nothing, a minimum reward is rerolled at a fixed result of 15 instead.</GuideRow>
      </GuideCard>

      <GuideCard title="Table Editor" icon={TableIcon}>
        <GuideRow>All tables are editable from the <strong>Tables</strong> tab. Edits apply immediately to
          generation and are saved automatically, locally and to the cloud when signed in. <strong>Reset to
          defaults</strong> restores the original tables after confirmation and saves that reset.</GuideRow>
        <GuideRow>The <strong>type</strong> field on the Event Table uses fixed keywords: <Kw>encounter</Kw>
          {' '}· <Kw>loot</Kw> · <Kw>camp_nemico</Kw> · <Kw>other</Kw> · <Kw>nothing</Kw>.</GuideRow>
        <GuideRow>The <strong>type</strong> field on the Complication Table uses (case sensitive):{' '}
          <Kw>Encounter</Kw> · <Kw>Environment Damage</Kw> · <Kw>Environment</Kw> · <Kw>None</Kw>.
        </GuideRow>
      </GuideCard>
    </Stack>
  );
}

const cardSx = {
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
};

const cardTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.86rem',
  letterSpacing: '0.06em',
  color: 'primary.main',
};

const rowWrapSx = {
  display: 'flex',
  gap: 0.6,
  alignItems: 'flex-start',
};

const rowSx = {
  fontSize: '0.82rem',
  color: 'text.primary',
  lineHeight: 1.6,
};

const stepMarkerSx = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  flexShrink: 0,
  mt: 0.3,
  borderRadius: '50%',
  border: '1px solid',
  borderColor: 'primary.main',
  color: 'primary.main',
  fontSize: '0.62rem',
  fontWeight: 700,
};

const kwSx = {
  display: 'inline-block',
  px: 0.5,
  py: 0.05,
  mx: 0.1,
  borderRadius: 0.75,
  border: '1px solid',
  borderColor: 'divider',
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontSize: '0.78em',
  color: 'text.primary',
};
