import { Box, Button, Stack, Typography } from '@mui/material';
import { FastForward, Footprints, Hexagon } from 'lucide-react';
import { POPULATION_ICONS, TERRAIN_ICONS } from '../../../shared/hexcrawl/hexIcons.js';
import ClockBar from '../session/ClockBar.jsx';
import SelectorGroup from '../../../shared/gmboard/ui/SelectorGroup.jsx';
import TierSelector from '../../../shared/gmboard/ui/TierSelector.jsx';
import MountSelector from '../../../shared/hexcrawl/ui/MountSelector.jsx';
import HexResultSteps from '../../../shared/hexcrawl/ui/HexResultSteps.jsx';
import SessionLog from '../session/SessionLog.jsx';
import { SELECTOR_CONTRACTS } from '../../../shared/gmboard/ui/selectorContracts.js';
import { travelLine, travelTime } from '../../../shared/gmboard/weather.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import { canAdvanceHex, missingHexSetup } from '../../../shared/hexcrawl/hexEntry.js';
import BoardPanel from '../ui/BoardPanel.jsx';

// The hexcrawl, top to bottom in the order a table plays it: the clock and
// the weather; the next hex (what it is, then how the party crosses it) and
// the step into it; what the step turned up; the log.
export default function HexcrawlView() {
  const { state, dispatch, proceed, advanceOnly, clockError } = useGmBoard();
  const popContract = SELECTOR_CONTRACTS.pop;
  const terrainContract = SELECTOR_CONTRACTS.terrain;

  const canAdvanceOnly = canAdvanceHex(state);
  // The board's picks stand for the hex, the way a map hex's own do.
  const missing = missingHexSetup({ terrain: state.terrain, pop: state.pop, tier: state.hexTier }, state);
  const canProceed = missing.length === 0;
  const travel = travelTime(state.terrainH, state.weather, state.intensity, state.mountSpeed);

  return (
    <Stack spacing={2}>
      {clockError ? <Typography variant="body2" sx={{ color: 'warning.main' }}>{clockError}</Typography> : null}
      <ClockBar />

      <BoardPanel icon={Hexagon} title="Next hex">
        <SelectorGroup
          label="Terrain"
          options={terrainContract.options}
          getId={terrainContract.getId}
          value={terrainContract.deriveValue(state)}
          onChange={(o) => dispatch(terrainContract.action(o))}
          getIcon={(o) => TERRAIN_ICONS[o.id]}
        />
        <Box sx={pairSx}>
          <SelectorGroup
            label="Population"
            options={popContract.options}
            getId={popContract.getId}
            value={popContract.deriveValue(state)}
            onChange={(o) => dispatch(popContract.action(o))}
            getIcon={(o) => POPULATION_ICONS[o.id]}
          />
          <TierSelector value={state.hexTier} onChange={(tier) => dispatch(SELECTOR_CONTRACTS.hexTier.action({ tier }))} />
        </Box>
        <Box sx={dividerSx} />
        {/* The mount belongs with the crossing, not with the hex: it is the
            same forest either way, and the party crosses it faster. */}
        <MountSelector
          value={state.mountSpeed}
          onChange={(mountSpeed) => dispatch({ type: 'setMountSpeed', mountSpeed })}
          note={state.terrain ? travelLine(state.terrain, travel) : null}
        />

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
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

const pairSx = {
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
