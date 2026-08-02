import { useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { Flag, Radio } from 'lucide-react';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { listMyCampaigns } from '../../../shared/cloud/campaigns.js';
import { listLiveScenes } from '../../../shared/cloud/vtt.js';

// Several campaigns can be running at the same time, so a player picks the table
// first. They never pick a scene: once inside, the GM decides what is on it and
// the view follows along.
export default function CampaignSessionPicker({ onJoin, showEmpty = true }) {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, campaigns: [] });

  useEffect(() => {
    let cancelled = false;
    Promise.all([listMyCampaigns(), listLiveScenes().catch(() => [])])
      .then(([campaigns, live]) => {
        if (cancelled) return;
        const liveByCampaign = new Set(live.map((scene) => scene.campaignId));
        setState({
          loading: false,
          // Campaigns the user runs are managed from the GM side of this page;
          // here they are only a player.
          campaigns: campaigns
            .filter((campaign) => campaign.gm !== user?.id)
            .map((campaign) => ({
              id: campaign.id,
              name: campaign.name || 'Campaign',
              hasLive: liveByCampaign.has(campaign.id),
            })),
        });
      })
      .catch(() => { if (!cancelled) setState({ loading: false, campaigns: [] }); });
    return () => { cancelled = true; };
  }, [user?.id]);

  if (state.loading) return <CircularProgress size={24} />;

  // Nothing to say to someone who only runs campaigns: they are not waiting for
  // an invite code, and telling them to ask their GM for one is nonsense when
  // they are the GM.
  if (!state.campaigns.length) {
    if (!showEmpty) return null;
    return (
      <Paper sx={emptySx}>
        <Typography color="text.secondary">
          You have not joined a campaign yet. Ask your GM for the invite code and join it from the
          Campaigns page.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="h1">Join a table</Typography>
      <Stack spacing={0.75}>
        {state.campaigns.map((campaign) => (
          <Box key={campaign.id} sx={rowSx}>
            <Box component="button" type="button" onClick={() => onJoin(campaign.id)} sx={rowButtonSx}>
              <Flag size={16} />
              <Typography sx={{ flex: 1, minWidth: 0 }}>{campaign.name}</Typography>
              {campaign.hasLive ? (
                <Chip size="small" color="success" icon={<Radio size={12} />} label="Live" sx={chipSx} />
              ) : (
                <Typography variant="caption" color="text.secondary">no map up</Typography>
              )}
            </Box>
          </Box>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Join a table with no map up and the page will wait; it opens by itself when the GM puts one on.
      </Typography>
    </Stack>
  );
}

const emptySx = {
  p: 4,
  bgcolor: 'background.paper',
  textAlign: 'center',
};

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  '&:hover': { borderColor: 'primary.main' },
};

const rowButtonSx = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  background: 'none',
  border: 0,
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  p: 1,
};

const chipSx = {
  height: 20,
  fontSize: '0.62rem',
  fontFamily: '"Cinzel", Georgia, serif',
};
