import { useCallback, useMemo, useState } from 'react';
import { Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import { Users } from 'lucide-react';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import { clampInt } from '../logic/monsterUtils.js';

export default function CampaignImport() {
  const { campaignPlayers, state, dispatch } = useEncounterBuilder();
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
  const handleAdd = useCallback(async () => {
    if (!selected || importing) return;
    setImporting(true);
    try {
      const fresh = await campaignPlayers.refreshCampaign?.(selected.id);
      const players = fresh || selected.players;
      if (players.length) {
        dispatch({ type: 'importCampaignPlayers', players });
      }
    } finally {
      setImporting(false);
    }
  }, [campaignPlayers, dispatch, importing, selected]);

  if (!campaignPlayers.cloudEnabled) return null;

  return (
    <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Users size={17} />
          <Typography variant="h2">Campaign Players</Typography>
        </Stack>
        {campaignPlayers.loading ? <Typography color="text.secondary">Loading campaign players...</Typography> : null}
        {!campaignPlayers.loading && !campaignPlayers.signedIn ? (
          <Typography color="text.secondary">Log in to import players from your GM campaigns.</Typography>
        ) : null}
        {campaignPlayers.error ? <Typography color="error.main">{campaignPlayers.error}</Typography> : null}
        {!campaignPlayers.loading && campaignPlayers.signedIn && !campaignPlayers.campaigns.length ? (
          <Typography color="text.secondary">No campaigns where you are GM.</Typography>
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
                startIcon={<Users size={15} />}
                disabled={!selected.players.length || importing}
                onClick={handleAdd}
              >
                {importing ? 'Adding...' : 'Add'}
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {selected.players.length
                ? `${selected.players.length} sheet${selected.players.length === 1 ? '' : 's'} · avg Lv ${campaignAverageLevel(selected.players)}`
                : 'No sheets attached to this campaign.'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {selected.players.slice(0, 10).map((player) => (
                <Chip
                  key={player.sourceId}
                  size="small"
                  label={`${player.name} Lv ${player.level}${player.ownerUsername ? ` - ${player.ownerUsername}` : ''}`}
                />
              ))}
              {selected.players.length > 10 ? <Chip size="small" label={`+${selected.players.length - 10} more`} /> : null}
            </Box>
            {state.campaignNotice ? (
              <Typography variant="caption" color="primary.main">{state.campaignNotice}</Typography>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Paper>
  );
}

function campaignAverageLevel(players) {
  if (!players.length) return 1;
  const total = players.reduce((sum, player) => sum + clampInt(player.level, 1, 20, 1), 0);
  return clampInt(total / players.length, 1, 20, 1);
}
