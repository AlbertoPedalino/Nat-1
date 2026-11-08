import { FormControlLabel, Switch, Typography } from '@mui/material';
import { useGmRollsShown } from '../../cloud/sync/rollVisibility.js';

// The GM's "show my rolls to players" for a campaign (rollVisibility.js), the
// same switch wherever the GM rolls: the encounter builder, a creature's stat
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
      label={shown ? 'My rolls are shown to players' : 'My rolls are for the GM only'}
      sx={[labelSx, sx]}
    />
  );
}

const labelSx = {
  m: 0,
  gap: 0.5,
  '& .MuiFormControlLabel-label': { fontSize: '0.78rem', color: 'text.secondary' },
};
