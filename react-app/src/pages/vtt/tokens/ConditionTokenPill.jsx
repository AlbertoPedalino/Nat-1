import { Box, Tooltip, Typography } from '@mui/material';
import { conditionLabel } from '../../../shared/character/combat/conditions.js';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import {
  pillSx,
  conditionPillSx,
  conditionTooltipSx,
  conditionTooltipBodySx,
  conditionTooltipTitleSx,
} from './tokenSpriteStyles.js';

// One condition above a piece, with its rules in a tooltip when they are known.
// `tooltipOpen` is set only while another client presents this piece, so the
// tooltip follows their pointer instead of ours.
export default function ConditionTokenPill({ conditionKey, entries, tooltipOpen, onInspect }) {
  const label = conditionLabel(conditionKey);
  const pill = (
    <Box
      component="span"
      tabIndex={0}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerEnter={() => onInspect?.(conditionKey)}
      onPointerLeave={() => onInspect?.(null)}
      onFocus={() => onInspect?.(conditionKey)}
      onBlur={() => onInspect?.(null)}
      sx={{ ...pillSx, ...conditionPillSx }}
    >
      {label}
    </Box>
  );

  if (!entries?.length) return pill;

  return (
    <Tooltip
      arrow
      placement="top"
      // A tap on the pill reads its rules; MUI's default asks for a long press.
      enterTouchDelay={0}
      leaveTouchDelay={4000}
      {...(tooltipOpen == null ? null : { open: tooltipOpen })}
      title={(
        <Box sx={conditionTooltipBodySx}>
          <Typography sx={conditionTooltipTitleSx}>{label}</Typography>
          <EntryBlocks
            entries={entries}
            spacing={0.45}
            fontSize="0.68rem"
            headingColor={VTT_COLORS.goldSoft}
            bodyColor={VTT_COLORS.parchment}
            markerColor={VTT_COLORS.goldSoft}
            strongColor={VTT_COLORS.goldSoft}
            emptyText={null}
          />
        </Box>
      )}
      slotProps={{
        tooltip: { sx: conditionTooltipSx },
      }}
    >
      {pill}
    </Tooltip>
  );
}
