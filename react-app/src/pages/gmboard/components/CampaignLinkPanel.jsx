import { useEffect, useState } from 'react';
import {
  Box, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { Link2 } from 'lucide-react';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { listMyCampaigns } from '../../../shared/cloud/campaigns.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';

// Which table this board keeps time for. Bound, the clock and the weather stop
// being this browser's business: the map writes them too, and both screens read
// the same row.
//
// Only campaigns the signed-in user runs are offered — the board holds the
// tables the party is not supposed to read.
export default function CampaignLinkPanel() {
  const { user, cloudEnabled } = useAuth();
  const {
    state, bindCampaign, campaignLinked, clockError, instanceSaved,
  } = useGmBoard();
  const [campaigns, setCampaigns] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!cloudEnabled || !user?.id) {
      setCampaigns([]);
      return () => { cancelled = true; };
    }
    listMyCampaigns()
      .then((rows) => {
        if (cancelled) return;
        setCampaigns(rows.filter((row) => row.gm === user.id));
      })
      .catch(() => { if (!cancelled) setCampaigns([]); });
    return () => { cancelled = true; };
  }, [cloudEnabled, user?.id]);

  if (!cloudEnabled || !user?.id) return null;

  const onChange = async (event) => {
    setBusy(true);
    await bindCampaign(event.target.value || null);
    setBusy(false);
  };

  return (
    <Stack spacing={1} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <Link2 size={14} />
        <Typography sx={titleSx}>Campaign</Typography>
      </Box>

      <TextField
        select
        size="small"
        label="Keeps the clock for"
        value={state.campaignId || ''}
        onChange={onChange}
        disabled={busy || !instanceSaved}
      >
        <MenuItem value="">No campaign — this board alone</MenuItem>
        {campaigns.map((campaign) => (
          <MenuItem key={campaign.id} value={campaign.id}>{campaign.name || 'Campaign'}</MenuItem>
        ))}
      </TextField>

      {!instanceSaved ? (
        <Typography variant="caption" color="text.secondary">
          Save this board first — a campaign has to point at something that exists.
        </Typography>
      ) : (
        <Typography variant="caption" color="text.secondary">
          {campaignLinked
            ? 'The date, the weather and the session log are shared with this campaign\'s map. Entering a hex there moves this clock, and Proceed here moves that one.'
            : 'Unbound: the clock stays in this browser, exactly as before.'}
        </Typography>
      )}

      {clockError ? (
        <Typography variant="caption" color="warning.main">{clockError}</Typography>
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
