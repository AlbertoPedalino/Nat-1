import { useEffect, useState } from 'react';
import {
  Box, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { Link2 } from 'lucide-react';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';
import { listMyCampaigns } from '../../../shared/cloud/api/campaigns.js';
import { linkHexcrawlBoardCampaign } from '../../../shared/cloud/api/hexcrawl.js';
import { getCloudSection } from '../../../shared/cloud/sections/cloudSections.js';

// Campaign linking lives beside the other tool links. There is no separate
// clock assignment: this relation also selects the map's tables and clock.
export default function CampaignLinkPanel({ boardId }) {
  const { user, cloudEnabled, status } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!cloudEnabled || status !== 'authed' || !user?.id) {
      setCampaigns([]);
      return () => { cancelled = true; };
    }
    setLoading(true);
    listMyCampaigns()
      .then((rows) => {
        if (cancelled) return;
        setCampaigns(rows.filter((row) => row.gm === user.id));
      })
      .catch((cause) => { if (!cancelled) setError(cause?.message || 'Could not read campaigns.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cloudEnabled, status, user?.id, boardId]);

  if (!cloudEnabled || !user?.id) return null;

  const onChange = async (event) => {
    const campaignId = event.target.value || null;
    setBusy(true);
    try {
      // Ensure a locally created board exists before the campaign references it.
      if (campaignId) {
        const api = getCloudSection('gmboard');
        if (!await api.fetchInstanceMeta(boardId)) await api.pushInstance(boardId);
      }
      await linkHexcrawlBoardCampaign(boardId, campaignId);
      const rows = await listMyCampaigns();
      setCampaigns(rows.filter((row) => row.gm === user.id));
      setError(null);
    } catch (cause) {
      setError(cause?.message || 'Could not link the campaign.');
    } finally {
      setBusy(false);
    }
  };

  const linked = campaigns.find((campaign) => campaign.hexcrawl_board_id === boardId);

  return (
    <Stack spacing={1} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <Link2 size={14} />
        <Typography sx={titleSx}>Campaign</Typography>
      </Box>

      <TextField
        select
        size="small"
        label="Linked campaign"
        value={linked?.id || ''}
        onChange={onChange}
        disabled={busy || loading || status !== 'authed'}
      >
        <MenuItem value="">No campaign</MenuItem>
        {campaigns.map((campaign) => (
          <MenuItem key={campaign.id} value={campaign.id}>{campaign.name || 'Campaign'}</MenuItem>
        ))}
      </TextField>

      <Typography variant="caption" color="text.secondary">
        Linking a campaign automatically synchronizes hexcrawl settings, time and weather with its maps.
      </Typography>

      {error ? (
        <Typography variant="caption" color="warning.main">{error}</Typography>
      ) : null}
    </Stack>
  );
}

const panelSx = {
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
};

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.8rem',
  letterSpacing: '0.06em',
  color: 'primary.main',
};
