import { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Flag, Radio } from 'lucide-react';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';
import { useLiveCampaigns } from '../../../shared/vtt/session/useLiveCampaigns.js';
import { LoadingLine } from '../../../shared/ui/LoadStatus.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CARD_SX, BARE_BUTTON_SX } from '../../../shared/ui/interactive.js';
import TagChip from '../../../shared/ui/TagChip.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import StatePanel from '../../../shared/ui/StatePanel.jsx';
import Caption from '../../../shared/ui/Caption.jsx';

// Several campaigns can be running at the same time, so a player picks the table
// first. They never pick a scene: once inside, the GM decides what is on it and
// the view follows along.
export default function CampaignSessionPicker({ campaigns = [], onJoin, showEmpty = true }) {
  const { user } = useAuth();
  // Campaigns the user runs are managed from the GM side of this page; here
  // they are only a player.
  const joined = useMemo(() => campaigns.filter((campaign) => campaign.gm !== user?.id), [campaigns, user?.id]);
  const { loading, live } = useLiveCampaigns(joined.map((campaign) => campaign.id));
  const state = {
    loading,
    campaigns: joined.map((campaign) => ({
      id: campaign.id,
      name: campaign.name || 'Campaign',
      hasLive: live.has(campaign.id),
    })),
  };

  if (state.loading) return <LoadingLine centered label="Loading campaigns…" />;

  // Nothing to say to someone who only runs campaigns: they are not waiting for
  // an invite code, and telling them to ask their GM for one is nonsense when
  // they are the GM.
  if (!state.campaigns.length) {
    if (!showEmpty) return null;
    return (
      <StatePanel title="No campaign yet">
        You have not joined a campaign yet. Ask your GM for the invite code and join it from the
        Campaigns page.
      </StatePanel>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="h1">Join a table</Typography>
      <Stack spacing={0.75}>
        {state.campaigns.map((campaign) => (
          <Box key={campaign.id} sx={rowSx}>
            <Box component="button" type="button" onClick={() => onJoin(campaign.id)} sx={rowButtonSx}>
              <Flag size={ICON_SIZES.md} />
              <Typography sx={{ flex: 1, minWidth: 0 }}>{campaign.name}</Typography>
              {campaign.hasLive ? (
                <TagChip tone={UI_COLORS.success} icon={<Radio size={ICON_SIZES.xs} />} label="Live" />
              ) : (
                <Caption>no map up</Caption>
              )}
            </Box>
          </Box>
        ))}
      </Stack>
      <Caption>
        Join a table with no map up and the page will wait; it opens by itself when the GM puts one on.
      </Caption>
    </Stack>
  );
}


const rowSx = {
  ...CARD_SX,
  display: 'flex',
  alignItems: 'center',
};

const rowButtonSx = {
  ...BARE_BUTTON_SX,
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  p: 1,
};

