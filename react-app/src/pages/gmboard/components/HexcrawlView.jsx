import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import { FastForward, Footprints, Map, Mountain } from 'lucide-react';
import WeatherPanel from './WeatherPanel.jsx';
import TimePanel from './TimePanel.jsx';
import SelectorGroup from './SelectorGroup.jsx';
import TierSelector from './TierSelector.jsx';
import HexResultSteps from './HexResultSteps.jsx';
import CampaignLinkPanel from './CampaignLinkPanel.jsx';
import SessionLog from './SessionLog.jsx';
import { SELECTOR_CONTRACTS } from '../logic/selectorContracts.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';

function missingSelections(state) {
  const missing = [];
  if (!state.season) missing.push('season');
  if (!state.terrain) missing.push('terrain');
  if (!state.pop) missing.push('population');
  if (!state.hexTier) missing.push('tier');
  return missing;
}

export default function HexcrawlView() {
  const { state, dispatch, proceed, advanceOnly } = useGmBoard();
  const theme = useTheme();
  const popContract = SELECTOR_CONTRACTS.pop;
  const terrainContract = SELECTOR_CONTRACTS.terrain;

  const canAdvanceOnly = Boolean(state.season) && Boolean(state.terrain);
  const canProceed = canAdvanceOnly && Boolean(state.pop) && Boolean(state.hexTier);
  const missing = missingSelections(state);

  return (
    <Stack spacing={2}>
      <CampaignLinkPanel />
      <WeatherPanel />
      <TimePanel />

      <Stack spacing={1.5} sx={panelSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Map size={14} color={theme.palette.primary.main} />
          <Typography sx={titleSx}>Travel</Typography>
        </Box>
        <Box sx={gridSx}>
          <SelectorGroup
            label="Population"
            options={popContract.options}
            getId={popContract.getId}
            value={popContract.deriveValue(state)}
            onChange={(o) => dispatch(popContract.action(o))}
          />
          <SelectorGroup
            label="Terrain"
            options={terrainContract.options}
            getId={terrainContract.getId}
            value={terrainContract.deriveValue(state)}
            onChange={(o) => dispatch(terrainContract.action(o))}
            getIcon={() => Mountain}
          />
        </Box>
        <Box sx={dividerSx} />
        <TierSelector value={state.hexTier} onChange={(tier) => dispatch({ type: 'setHexTier', hexTier: tier })} />

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Footprints size={15} />}
            disabled={!canProceed}
            onClick={proceed}
          >
            Proceed
          </Button>
          <Button
            variant="outlined"
            startIcon={<FastForward size={15} />}
            disabled={!canAdvanceOnly}
            onClick={advanceOnly}
          >
            Advance Only
          </Button>
          {missing.length ? (
            <Typography sx={hintSx}>Select {missing.join(', ')} to continue.</Typography>
          ) : null}
        </Stack>
      </Stack>

      <HexResultSteps result={state.hexResult} />
      <SessionLog />
    </Stack>
  );
}

const panelSx = {
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
};

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.8rem',
  letterSpacing: '0.06em',
  color: 'primary.main',
};

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
  gap: 1.25,
};

const dividerSx = {
  borderTop: '1px solid',
  borderColor: 'divider',
};

const hintSx = {
  fontSize: '0.72rem',
  color: 'warning.main',
};
