import { FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';

export default function RollSharingControls() {
  const { campaignPlayers, rollSync } = useEncounterBuilder();
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
      <TextField
        select size="small" label="Roll log campaign"
        value={rollSync.campaignId || ''}
        onChange={(event) => rollSync.updateSettings({ campaignId: event.target.value || null })}
        sx={{ minWidth: 220 }}
      >
        <MenuItem value="">Local only</MenuItem>
        {campaignPlayers.campaigns.map((campaign) => (
          <MenuItem key={campaign.id} value={campaign.id}>{campaign.name}</MenuItem>
        ))}
      </TextField>
      <Stack>
        <FormControlLabel
          control={<Switch checked={rollSync.showToPlayers} onChange={(_, checked) => rollSync.updateSettings({ showToPlayers: checked })} />}
          label="Show my rolls to players"
        />
        <Typography variant="caption" color="text.secondary">
          {rollSync.campaignId
            ? 'Applies to new monster sheet and custom rolls. Hidden rolls stay in the GM logs.'
            : 'Select a campaign to sync with its battle map and player logs.'}
        </Typography>
      </Stack>
    </Stack>
  );
}
