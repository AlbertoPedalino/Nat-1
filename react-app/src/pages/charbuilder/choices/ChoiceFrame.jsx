import { Chip, Paper, Stack, Typography } from '@mui/material';
import { FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { BUILDER_TEXT } from '../layout/builderText.js';

// The frame every builder choice sits in: its label and how many of the
// allowed picks are taken ("2/3", or `countLabel` for a count that says more),
// then the choice itself.
export default function ChoiceFrame({
  label, count, max, countLabel = null, children,
}) {
  const full = max > 0 && count >= max;
  return (
    <Paper variant="outlined" sx={{ p: 1, minWidth: 0 }}>
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={labelSx}>{label}</Typography>
          {max != null ? (
            <Chip
              size="small"
              label={countLabel || `${count}/${max}`}
              color={full ? 'primary' : 'default'}
              variant={full ? 'filled' : 'outlined'}
            />
          ) : null}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

const labelSx = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  color: 'text.secondary',
  ...BUILDER_TEXT.value,
  fontWeight: FONT_WEIGHTS.heavy,
  lineHeight: LINE_HEIGHTS.snug,
};
