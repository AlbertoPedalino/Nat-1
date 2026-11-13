import { Stack } from '@mui/material';
import GmRollsShownSwitch from '../../../shared/character/dice/GmRollsShownSwitch.jsx';
import { encounterPanel } from '../state/EncounterBuilderContext.jsx';
import Caption from '../../../shared/ui/Caption.jsx';
import SelectField from '../../../shared/ui/SelectField.jsx';

// Which campaign this builder's rolls go to, and whether the GM's rolls are
// shown to its players (the same switch as on the battle map).
export default encounterPanel({ state: [], context: ['campaignPlayers', 'rollSync'] }, RollSharingControlsView);

function RollSharingControlsView({ state, campaignPlayers, rollSync }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
      <SelectField
        label="Roll log campaign"
        value={rollSync.campaignId || ''}
        onChange={(value) => rollSync.updateSettings({ campaignId: value || null })}
        emptyOption={{ label: 'Local only' }}
        options={campaignPlayers.campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name }))}
        fullWidth={false}
        sx={{ minWidth: 220 }}
      />
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
