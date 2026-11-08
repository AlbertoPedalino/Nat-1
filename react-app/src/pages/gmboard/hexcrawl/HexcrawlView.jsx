import { Box, Button, Stack, Typography } from '@mui/material';
import { FastForward, Footprints, Map } from 'lucide-react';
import { POPULATION_ICONS, TERRAIN_ICONS } from '../../../shared/hexcrawl/hexIcons.js';
import WeatherPanel from '../session/WeatherPanel.jsx';
import TimePanel from '../session/TimePanel.jsx';
import SelectorGroup from '../../../shared/gmboard/ui/SelectorGroup.jsx';
import TierSelector from '../../../shared/gmboard/ui/TierSelector.jsx';
import MountSelector from '../../../shared/hexcrawl/ui/MountSelector.jsx';
import HexResultSteps from '../../../shared/hexcrawl/ui/HexResultSteps.jsx';
import SessionLog from '../session/SessionLog.jsx';
import { SELECTOR_CONTRACTS } from '../../../shared/gmboard/ui/selectorContracts.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import { missingHexSetup } from '../../../shared/hexcrawl/hexEntry.js';
import BoardPanel from '../ui/BoardPanel.jsx';

export default function HexcrawlView() {
  const { state, dispatch, proceed, advanceOnly, clockError } = useGmBoard();
  const popContract = SELECTOR_CONTRACTS.pop;
  const terrainContract = SELECTOR_CONTRACTS.terrain;

  const canAdvanceOnly = Boolean(state.season) && Boolean(state.terrain);
  // The board's Travel picks stand for the hex, the way a map hex's own do.
  const missing = missingHexSetup({ terrain: state.terrain, pop: state.pop, tier: state.hexTier }, state);
  const canProceed = missing.length === 0;

  return (
    <Stack spacing={2}>
      {clockError ? <Typography variant="body2" sx={{ color: 'warning.main' }}>{clockError}</Typography> : null}
      <WeatherPanel />
      <TimePanel />

      <BoardPanel icon={Map} title="Travel">
        <Box sx={gridSx}>
          <SelectorGroup
            label="Population"
            options={popContract.options}
            getId={popContract.getId}
            value={popContract.deriveValue(state)}
            onChange={(o) => dispatch(popContract.action(o))}
            getIcon={(o) => POPULATION_ICONS[o.id]}
          />
          <SelectorGroup
            label="Terrain"
            options={terrainContract.options}
            getId={terrainContract.getId}
            value={terrainContract.deriveValue(state)}
            onChange={(o) => dispatch(terrainContract.action(o))}
            getIcon={(o) => TERRAIN_ICONS[o.id]}
          />
        </Box>
        <Box sx={dividerSx} />
        {/* The mount belongs with the travel, not with the hex: it is the same
            forest either way, and the party crosses it faster. */}
        <MountSelector
          value={state.mountSpeed}
          onChange={(mountSpeed) => dispatch({ type: 'setMountSpeed', mountSpeed })}
        />
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
      </BoardPanel>

      <HexResultSteps result={state.hexResult} />
      <SessionLog />
    </Stack>
  );
}

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
