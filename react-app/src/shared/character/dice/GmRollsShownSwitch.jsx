import { FormControlLabel, Switch, Typography } from '@mui/material';
import { useGmRollsShown } from '../../cloud/sync/rollVisibility.js';
import { FONT_SIZES } from '../../ui/fonts.js';

// Whether the players see the creatures' rolls — and the GM's own custom
// rolls with them — for a campaign (rollVisibility.js): the same switch
// wherever the GM rolls: the encounter builder, a creature's stat
// block and the dice on the map. Without a campaign there is no table to show
// rolls to, and it says so.
export default function GmRollsShownSwitch({ campaignId, sx }) {
  const [shown, setShown] = useGmRollsShown(campaignId);
  if (!campaignId) {
    return <Typography variant="caption" sx={{ color: 'text.secondary', ...sx }}>No campaign: rolls stay on this screen.</Typography>;
  }
  return (
    <FormControlLabel
      control={<Switch size="small" checked={shown} onChange={(_, checked) => setShown(checked)} />}
      label={shown ? 'Players see creature rolls' : 'Only the GM sees creature rolls'}
      sx={[labelSx, sx]}
    />
  );
}

const labelSx = {
  m: 0,
  gap: 0.5,
  '& .MuiFormControlLabel-label': { fontSize: FONT_SIZES.lg, color: 'text.secondary' },
};
