import { useCallback, useMemo, useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { Users } from 'lucide-react';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import { clampInt } from '../../../shared/numbers.js';
import LoadStatus from '../../../shared/ui/LoadStatus.jsx';
import { runBusy } from '../../../shared/ui/busyAction.js';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Panel from '../../../shared/ui/Panel.jsx';
import TagChip from '../../../shared/ui/TagChip.jsx';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import Caption from '../../../shared/ui/Caption.jsx';

export default function CampaignImport() {
  const { campaignPlayers, state, dispatch } = useEncounterBuilder();
  const { notify } = useToast();
  const [selectedId, setSelectedId] = useState('');
  const [importing, setImporting] = useState(false);
  const selected = useMemo(() => (
    campaignPlayers.campaigns.find((campaign) => campaign.id === selectedId)
    || campaignPlayers.campaigns[0]
    || null
  ), [campaignPlayers.campaigns, selectedId]);

  // Sheets are fetched once on page load, so re-fetch the selected campaign's
  // right before importing: ones edited since then (HP, wild shape, level up)
  // would otherwise come in stale. Falls back to the cached list on failure.
  const handleAdd = useCallback(() => {
    if (!selected || importing) return null;
    return runBusy({ setBusy: setImporting, notify }, async () => {
      const fresh = await Promise.resolve(campaignPlayers.refreshCampaign?.(selected.id)).catch(() => null);
      const players = fresh || selected.players;
      if (players.length) dispatch({ type: 'importCampaignPlayers', players });
    }, 'Could not add the campaign players.');
  }, [campaignPlayers, dispatch, importing, notify, selected]);

  if (!campaignPlayers.cloudEnabled) return null;

  return (
    <Panel icon={Users} title="Campaign Players">
      <Stack spacing={1.5}>
        <LoadStatus
          status={campaignPlayers.loading ? 'loading' : campaignPlayers.error ? 'error' : 'ready'}
          loadingLabel="Loading campaign players…"
          errorMessage={campaignPlayers.error}
        />
        {!campaignPlayers.loading && !campaignPlayers.signedIn ? (
          <EmptyLine>Log in to import players from your GM campaigns.</EmptyLine>
        ) : null}
        {!campaignPlayers.loading && campaignPlayers.signedIn && !campaignPlayers.campaigns.length ? (
          <EmptyLine>No campaigns where you are GM.</EmptyLine>
        ) : null}
        {selected ? (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <FormControl size="small" fullWidth>
                <InputLabel>Campaign</InputLabel>
                <Select
                  label="Campaign"
                  value={selected.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  {campaignPlayers.campaigns.map((campaign) => (
                    <MenuItem key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.players.length})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<Users size={ICON_SIZES.sm} />}
                disabled={!selected.players.length || importing}
                onClick={handleAdd}
              >
                {importing ? 'Adding…' : 'Add'}
              </Button>
            </Stack>
            <Caption>
              {selected.players.length
                ? `${selected.players.length} sheet${selected.players.length === 1 ? '' : 's'} · avg Lv ${campaignAverageLevel(selected.players)}`
                : 'No sheets attached to this campaign.'}
            </Caption>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {selected.players.slice(0, 10).map((player) => (
                <TagChip
                  key={player.sourceId}
                  label={`${player.name} Lv ${player.level}${player.ownerUsername ? ` - ${player.ownerUsername}` : ''}`}
                />
              ))}
              {selected.players.length > 10 ? <TagChip label={`+${selected.players.length - 10} more`} /> : null}
            </Box>
            {state.campaignNotice ? (
              <Typography variant="caption" sx={{ color: 'primary.main' }}>{state.campaignNotice}</Typography>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Panel>
  );
}

function campaignAverageLevel(players) {
  if (!players.length) return 1;
  const total = players.reduce((sum, player) => sum + clampInt(player.level, 1, 20, 1), 0);
  return clampInt(total / players.length, 1, 20, 1);
}
