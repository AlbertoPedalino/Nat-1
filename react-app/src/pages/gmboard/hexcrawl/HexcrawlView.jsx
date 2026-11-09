import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { FastForward, Footprints, Hexagon } from 'lucide-react';
import { POPULATION_ICONS, TERRAIN_ICONS } from '../../../shared/hexcrawl/hexIcons.js';
import ClockBar from '../session/ClockBar.jsx';
import SelectorGroup from '../../../shared/gmboard/ui/SelectorGroup.jsx';
import TierSelector from '../../../shared/gmboard/ui/TierSelector.jsx';
import MountSelector from '../../../shared/hexcrawl/ui/MountSelector.jsx';
import HexResultSteps from '../../../shared/hexcrawl/ui/HexResultSteps.jsx';
import SessionLog from '../session/SessionLog.jsx';
import { SELECTOR_CONTRACTS } from '../../../shared/gmboard/ui/selectorContracts.js';
import { travelLine, travelTime, weatherName } from '../../../shared/gmboard/weather.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import { canAdvanceHex, missingHexSetup } from '../../../shared/hexcrawl/hexEntry.js';
import BoardPanel from '../ui/BoardPanel.jsx';
import { captionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { formatCampaignDateTime } from '../../../shared/gmboard/campaignTime.js';

// The hexcrawl, top to bottom in the order a table plays it: the clock and
// the weather; the next hex (what it is, then how the party crosses it); the
// step into it, with everything it will use said back; what the step turned
// up; the log.
export default function HexcrawlView() {
  const { state, dispatch, proceed, advanceOnly, clockError } = useGmBoard();
  const popContract = SELECTOR_CONTRACTS.pop;
  const terrainContract = SELECTOR_CONTRACTS.terrain;

  const canAdvanceOnly = canAdvanceHex(state);
  // The board's picks stand for the hex, the way a map hex's own do.
  const missing = missingHexSetup({ terrain: state.terrain, pop: state.pop, tier: state.hexTier }, state);
  const canProceed = missing.length === 0;
  const travel = travelTime(state.terrainH, state.weather, state.intensity, state.mountSpeed);
  const popOption = popContract.options.find((option) => popContract.getId(option) === popContract.deriveValue(state));

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
        <Divider />
        {/* The mount belongs with the crossing, not with the hex: it is the
            same forest either way, and the party crosses it faster. */}
        <MountSelector
          value={state.mountSpeed}
          onChange={(mountSpeed) => dispatch({ type: 'setMountSpeed', mountSpeed })}
        />
      </BoardPanel>

      {/* The step itself, apart from any one setting: it uses the clock, the
          weather and every pick above together. */}
      <Box sx={moveBarSx}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={moveTitleSx}>Move the party</Typography>
          <Typography sx={moveSummarySx}>
            {[
              formatCampaignDateTime(state),
              weatherName(state.weather, state.intensity),
              state.terrain ? travelLine(state.terrain, travel) : null,
              popOption?.label,
              state.hexTier ? `Tier ${state.hexTier}` : null,
              `Mount ×${state.mountSpeed}`,
            ].filter(Boolean).join(' · ')}
          </Typography>
          {missing.length ? (
            <Typography sx={hintSx}>Select {missing.join(', ')} to continue.</Typography>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
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
        </Stack>
      </Box>

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

const moveBarSx = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'stretch', sm: 'center' },
  justifyContent: 'space-between',
  gap: 1.5,
  p: 1.5,
  border: '1px solid',
  borderColor: 'primary.main',
  borderRadius: 2,
  bgcolor: uiAlpha(UI_COLORS.gold, 0.06),
};

const moveTitleSx = { ...captionLabelSx, color: 'primary.main' };

const moveSummarySx = { fontSize: '0.8rem', color: 'text.primary', mt: 0.25 };

const hintSx = {
  fontSize: '0.72rem',
  color: 'warning.main',
};
