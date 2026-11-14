import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';
import { useLiveCampaigns } from '../../../shared/vtt/session/useLiveCampaigns.js';
import { LoadingLine } from '../../../shared/ui/LoadStatus.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { TOOL_ICONS } from '../../../shared/ui/gameIcons.js';
import TagChip, { LiveTag } from '../../../shared/ui/TagChip.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import StatePanel from '../../../shared/ui/StatePanel.jsx';
import Caption from '../../../shared/ui/Caption.jsx';
import EntityRow from '../../../shared/ui/EntityRow.jsx';
import ListFilterBar from '../../../shared/ui/ListFilterBar.jsx';
import { useListFilter } from '../../../shared/ui/useListFilter.js';

const campaignText = (campaign) => campaign.name;

// The battle map's first step: every table the user sits at, the ones they
// run and the ones they play at in one list, since running one campaign does
// not stop you being a player in another. A table they run opens its scenes
// (`onRun`); one they play at joins it (`onJoin`): a player never picks a
// scene, the GM decides what is on it and the view follows along.
export default function CampaignTablePicker({ campaigns = [], onRun, onJoin }) {
  const { user } = useAuth();
  const tables = useMemo(() => campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name || 'Campaign',
    runs: campaign.gm === user?.id,
  })), [campaigns, user?.id]);
  const { loading, live } = useLiveCampaigns(tables.map((table) => table.id));
  const filter = useListFilter(tables, { getText: campaignText });

  if (loading) return <LoadingLine centered label="Loading campaigns…" />;

  if (!tables.length) {
    return (
      <StatePanel title="No campaign yet">
        Maps belong to a campaign. Create one, or ask your GM for the invite code and join it, from the
        Campaigns page.
      </StatePanel>
    );
  }

  return (
    <Box>
      <ListFilterBar filter={filter} what="tables" />
      <Stack spacing={0.75}>
        {filter.visible.map((table) => (
          <EntityRow
            key={table.id}
            surface="card"
            onClick={() => (table.runs ? onRun(table.id) : onJoin(table.id))}
            leading={<TOOL_ICONS.campaigns size={ICON_SIZES.md} />}
            title={table.name}
            badge={table.runs ? <TagChip component="span" label="GM" tone={UI_COLORS.accent} /> : null}
            meta={live.has(table.id) ? <LiveTag component="span" /> : 'no map up'}
          />
        ))}
      </Stack>
      <Caption sx={{ display: 'block', mt: 1.5 }}>
        A table you run opens its scenes. Join one you play at with no map up and the page will wait; it
        opens by itself when the GM puts one on.
      </Caption>
    </Box>
  );
}
