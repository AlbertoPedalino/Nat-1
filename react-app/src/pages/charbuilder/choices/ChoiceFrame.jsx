import { Chip, Stack, Typography } from '@mui/material';
import BuilderBox from '../layout/BuilderBox.jsx';
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
    <BuilderBox spacing={0.75}>
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
    </BuilderBox>
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
