import { MenuItem, Stack, TextField } from '@mui/material';
import GmRollsShownSwitch from '../../../shared/character/dice/GmRollsShownSwitch.jsx';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import Caption from '../../../shared/ui/Caption.jsx';

// Which campaign this builder's rolls go to, and whether the GM's rolls are
// shown to its players (the same switch as on the battle map).
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
        <GmRollsShownSwitch campaignId={rollSync.campaignId} />
        {rollSync.campaignId ? (
          <Caption>
            Applies to new creature and custom rolls, here and on the campaign's map. Hidden rolls stay in the GM logs.
          </Caption>
        ) : null}
      </Stack>
    </Stack>
  );
}
