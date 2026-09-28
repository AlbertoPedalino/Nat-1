import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { LayoutDashboard, Map, Network, Plus, StickyNote, Swords, Unlink } from 'lucide-react';
import { useAuth } from '../../shared/cloud/auth/AuthProvider.jsx';
import { listMyCampaigns } from '../../shared/cloud/api/campaigns.js';
import { setCampaignDungeonEncounter, setCampaignToolGroup } from '../../shared/cloud/api/campaignTools.js';
import { linkHexcrawlBoardCampaign, setCampaignHexcrawlBoard } from '../../shared/cloud/api/hexcrawl.js';
import {
  makeLinkGroupId, normalizeLinkGroupId, resolveGroupMerge, setLocalInstanceLink,
} from '../../shared/instances/instanceLinks.js';
import { createInstance } from '../../shared/instances/instanceStore.js';
import { ensureInstanceInCloud, linkCloudInstance, listToolInstances } from '../../shared/instances/instanceSync.js';
import { SECTION_KEYS, SECTION_REGISTRY } from '../../shared/instances/sectionRegistry.js';
import { useToast } from '../../shared/ui/ToastProvider.jsx';

const TOOL_UI = {
  gmboard: { label: 'GM Board', icon: LayoutDashboard },
  encounters: { label: 'Encounter Builder', icon: Swords },
  dmscreen: { label: 'DM Screen', icon: StickyNote },
  campaign: { label: 'Campaign · Battlemap', icon: Map },
};
const rowKey = (row) => `${row.sectionKey}:${row.id}`;
const rowRoute = (row) => row.sectionKey === 'campaign'
  ? `/vtt?campaign=${encodeURIComponent(row.id)}` : SECTION_REGISTRY[row.sectionKey].route(row.id);

// Tool pages render this only once their instance is open, so the current
// instance always exists locally (campaigns are cloud rows).
export default function LinkedToolsMenu({ sectionKey, instanceId, initialLinkGroupId }) {
  const navigate = useNavigate();
  const { cloudEnabled, status, user } = useAuth();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [incomplete, setIncomplete] = useState(false);
  const canUseCloud = cloudEnabled && status === 'authed';

  const loadRows = useCallback(async () => {
    const results = await Promise.allSettled([
      ...SECTION_KEYS.map((key) => listToolInstances(key, { includeCloud: canUseCloud })),
      canUseCloud ? listMyCampaigns() : Promise.resolve([]),
    ]);
    const merged = SECTION_KEYS.flatMap((key, index) => (
      results[index].status === 'fulfilled' ? results[index].value.rows : []
    ));
    const campaigns = results[SECTION_KEYS.length];
    if (campaigns.status === 'fulfilled') {
      merged.push(...campaigns.value.filter((row) => row.gm === user?.id).map((row) => ({
        id: row.id, name: row.name, sectionKey: 'campaign', origin: 'cloud',
        linkGroupId: normalizeLinkGroupId(row.link_group_id), hexcrawlBoardId: row.hexcrawl_board_id,
        dungeonEncounterId: row.dungeon_encounter_id,
      })));
    }
    let failure = results.some((result) => result.status === 'rejected' || result.value?.error)
      ? 'Some links could not be loaded. Reopen this panel to retry before changing links.' : '';
    // Persist the sole available board so the map and the board's own clock
    // resolve the same assignment, including groups created before auto-selection.
    if (!failure) {
      try {
        for (const campaign of merged.filter((row) => row.sectionKey === 'campaign' && row.linkGroupId && !row.hexcrawlBoardId)) {
          const boards = merged.filter((row) => row.sectionKey === 'gmboard' && row.linkGroupId === campaign.linkGroupId);
          if (boards.length !== 1) continue;
          const board = boards[0];
          // A board has one campaign clock. Do not silently move it from another campaign.
          const campaignMembers = merged.filter((row) => row.sectionKey === 'campaign' && row.linkGroupId === campaign.linkGroupId);
          if (campaignMembers.length !== 1 || merged.some((row) => row.sectionKey === 'campaign' && row.hexcrawlBoardId === board.id)) continue;
          if (board.origin === 'local') await ensureInstanceInCloud('gmboard', board.id);
          await linkHexcrawlBoardCampaign(board.id, campaign.id);
          campaign.hexcrawlBoardId = board.id;
        }
      } catch (cause) {
        failure = cause?.message || 'Could not select the linked GM Board. Reopen this panel to retry.';
      }
    }
    setRows(merged);
    setIncomplete(Boolean(failure));
    setError(failure);
  }, [canUseCloud, user?.id]);

  const handleOpen = async () => {
    setOpen(true);
    setAdding(false);
    setLoading(true);
    try { await loadRows(); } finally { setLoading(false); }
  };
  const current = rows.find((row) => row.sectionKey === sectionKey && row.id === instanceId);
  const groupId = normalizeLinkGroupId(current ? current.linkGroupId : initialLinkGroupId);
  const linkedRows = useMemo(() => rows.filter((row) => groupId
    && normalizeLinkGroupId(row.linkGroupId) === groupId && rowKey(row) !== `${sectionKey}:${instanceId}`),
  [groupId, instanceId, rows, sectionKey]);
  const candidates = rows.filter((row) => rowKey(row) !== `${sectionKey}:${instanceId}`
    && (!groupId || normalizeLinkGroupId(row.linkGroupId) !== groupId));
  const disabled = working || incomplete || !current;

  const updateMember = async (row, nextGroupId) => {
    if (row.sectionKey === 'campaign') {
      await setCampaignToolGroup(row.id, nextGroupId);
      return;
    }
    // A local copy is relinked locally and synced; a cloud-only row directly.
    if (row.hasLocal) {
      setLocalInstanceLink(row.sectionKey, row.id, nextGroupId);
      if (canUseCloud) await ensureInstanceInCloud(row.sectionKey, row.id);
    } else if (canUseCloud) {
      await linkCloudInstance(row.sectionKey, row.id, nextGroupId);
    }
  };

  const changeLinks = async (action, success) => {
    setWorking(true);
    setError('');
    let failure;
    try { await action(); } catch (cause) { failure = cause; }
    // Refresh even after a partial cloud failure; never display stale membership.
    try { await loadRows(); } finally { setWorking(false); }
    window.dispatchEvent(new Event('gb:campaign-board-link-changed'));
    window.dispatchEvent(new Event('gb:instance-links-changed'));
    if (failure) { setError(failure.message || 'Could not update links.'); return false; }
    notify('success', success);
    return true;
  };

  const handleLink = async (target) => {
    if (disabled) return;
    const plan = resolveGroupMerge(current, target, rows);
    if (plan.mergesGroups && !window.confirm('These tools belong to different groups. Connect all tools in both groups?')) return;
    await changeLinks(async () => {
      // Save tool instances before any campaign can reference them.
      for (const row of plan.members.filter((member) => member.sectionKey !== 'campaign')) await updateMember(row, plan.groupId);
      const campaigns = plan.members.filter((row) => row.sectionKey === 'campaign');
      for (const campaign of campaigns) {
        await updateMember(campaign, plan.groupId);
      }
    }, 'Tool linked.');
  };

  const handleUnlink = async (target) => {
    if (disabled) return;
    await changeLinks(async () => {
      // Only remove the selected member. Singleton groups remain valid because
      // a campaign can still belong to one when its board has been removed.
      if (target.sectionKey === 'gmboard' && canUseCloud) {
        for (const campaign of rows.filter((row) => row.sectionKey === 'campaign' && row.hexcrawlBoardId === target.id)) {
          await setCampaignHexcrawlBoard(campaign.id, null);
        }
      }
      if (target.sectionKey === 'encounters' && canUseCloud) {
        for (const campaign of rows.filter((row) => row.sectionKey === 'campaign' && row.dungeonEncounterId === target.id)) {
          await setCampaignDungeonEncounter(campaign.id, null);
        }
      }
      await updateMember(target, null);
    }, `${target.name} unlinked. Other tools remain connected.`);
  };

  const handleCreate = async (key) => {
    if (disabled) return;
    const nextGroup = groupId || makeLinkGroupId();
    let entry;
    const ok = await changeLinks(async () => {
      if (!groupId) await updateMember(current, nextGroup);
      // Created locally; it reaches the cloud once its page saves it.
      entry = createInstance(key, { linkGroupId: nextGroup });
      if (!entry) throw new Error('Could not create the linked tool on this device.');
    }, 'Tool created and linked.');
    if (ok) { setOpen(false); navigate(SECTION_REGISTRY[key].route(entry.id)); }
  };

  const handleSelectDungeonEncounter = (campaign, encounterId) => changeLinks(async () => {
    const target = rows.find((row) => row.sectionKey === 'encounters' && row.id === encounterId);
    if (target?.origin === 'local') await ensureInstanceInCloud('encounters', target.id);
    await setCampaignDungeonEncounter(campaign.id, encounterId || null);
  }, 'Dungeon Encounter Builder updated.');

  const handleSelectBoard = (campaign, boardId) => changeLinks(async () => {
    const target = rows.find((row) => row.sectionKey === 'gmboard' && row.id === boardId);
    if (!target) throw new Error('This GM Board is no longer available.');
    if (target.origin === 'local') await ensureInstanceInCloud('gmboard', target.id);
    await linkHexcrawlBoardCampaign(target.id, campaign.id);
  }, 'Campaign settings updated.');

  const button = <Button size="small" variant={groupId ? 'contained' : 'outlined'} color="primary"
    startIcon={<Network size={14} />} onClick={handleOpen}
    aria-label="Linked tools" sx={LINKED_TOOLS_BUTTON_SX}>
    <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>LINKS</Box>
  </Button>;

  return <>
    {button}
    <Dialog open={open} onClose={() => !working && setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Linked tools</DialogTitle>
      <DialogContent dividers>
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box> : <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Tools in this list are connected to each other. Removing one keeps the others connected.
          </Typography>
          {error && <Typography role="alert" color="error" variant="body2">{error}</Typography>}
          <Stack spacing={1}>
            {[...(current ? [current] : []), ...linkedRows].map((row) => {
              const isCurrent = rowKey(row) === `${sectionKey}:${instanceId}`;
              const Icon = TOOL_UI[row.sectionKey].icon;
              const clockCampaigns = rows.filter((campaign) => campaign.sectionKey === 'campaign' && campaign.hexcrawlBoardId === row.id);
              const campaignBoards = row.sectionKey === 'campaign' ? rows.filter((tool) => (
                tool.sectionKey === 'gmboard' && (tool.id === row.hexcrawlBoardId || (row.linkGroupId && tool.linkGroupId === row.linkGroupId))
              )) : [];
              const dungeonBuilders = row.sectionKey === 'campaign' ? rows.filter((tool) => (
                tool.sectionKey === 'encounters' && row.linkGroupId && tool.linkGroupId === row.linkGroupId
              )) : [];
              const dungeonSelection = row.dungeonEncounterId || (dungeonBuilders.length === 1 ? dungeonBuilders[0].id : '');
              const singleDungeonBuilder = dungeonBuilders.length === 1 && dungeonSelection === dungeonBuilders[0].id;
              return <Stack key={rowKey(row)} direction="row" spacing={1}
                sx={{ alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
                <Icon size={18} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{row.name}{isCurrent ? ' · Current' : ''}</Typography>
                  <Typography component="div" variant="caption" color="text.secondary">{TOOL_UI[row.sectionKey].label}</Typography>
                  {row.sectionKey === 'gmboard' && clockCampaigns.length > 0 && <Typography component="div" variant="caption" color="text.secondary"
                    sx={{ mt: 0.5, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                    Provides time, weather and tables for {clockCampaigns.map((campaign) => campaign.name).join(', ')}.
                  </Typography>}
                  {row.sectionKey === 'campaign' && <TextField select fullWidth size="small"
                    label={`Time, weather & tables for ${row.name}`} sx={{ mt: 1 }}
                    slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                    value={row.hexcrawlBoardId || ''}
                    disabled={disabled || !campaignBoards.length || (campaignBoards.length === 1 && Boolean(row.hexcrawlBoardId))}
                    onChange={(event) => handleSelectBoard(row, event.target.value)}>
                    {!row.hexcrawlBoardId && <MenuItem value="" disabled>
                      {campaignBoards.length ? 'Choose a GM Board' : 'Link a GM Board to use time, weather and tables'}
                    </MenuItem>}
                    {campaignBoards.map((board) => <MenuItem key={board.id} value={board.id}>
                      {campaignBoards.length === 1 ? `Automatic: ${board.name}` : board.name}
                    </MenuItem>)}
                  </TextField>}
                  {row.sectionKey === 'campaign' && <TextField select fullWidth size="small"
                    label="Dungeon fights" sx={{ mt: 1 }}
                    slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                    value={dungeonSelection} disabled={disabled || !dungeonBuilders.length || singleDungeonBuilder}
                    helperText="Destination for new fights. Previously sent fights stay in their original builder."
                    onChange={(event) => handleSelectDungeonEncounter(row, event.target.value)}>
                    {!dungeonSelection && <MenuItem value="" disabled>
                      {dungeonBuilders.length ? 'Choose an Encounter Builder' : 'Link an Encounter Builder to send dungeon fights'}
                    </MenuItem>}
                    {row.dungeonEncounterId && !dungeonBuilders.some((tool) => tool.id === row.dungeonEncounterId)
                      && <MenuItem value={row.dungeonEncounterId} disabled>Previously selected builder is no longer linked</MenuItem>}
                    {dungeonBuilders.map((tool) => <MenuItem key={tool.id} value={tool.id}>
                      {singleDungeonBuilder ? `Automatic: ${tool.name}` : tool.name}
                    </MenuItem>)}
                  </TextField>}
                </Box>
                {!isCurrent && <Button component={RouterLink} to={rowRoute(row)} target="_blank" rel="noopener noreferrer"
                  size="small" disabled={working} aria-label={`Open ${row.name}`} onClick={() => setOpen(false)}>Open</Button>}
                {groupId && <Tooltip title={`Unlink ${row.name}`}><span><IconButton size="small" color="error"
                  aria-label={`Unlink ${row.name}`} disabled={disabled} onClick={() => handleUnlink(row)}><Unlink size={16} /></IconButton></span></Tooltip>}
              </Stack>;
            })}
          </Stack>
          {!linkedRows.length && <Typography variant="body2" color="text.secondary">No other tools are linked yet.</Typography>}
          {adding ? <TextField select fullWidth size="small" label="Add a tool or campaign" value="" disabled={disabled}
            onChange={(event) => {
              const value = event.target.value;
              if (value.startsWith('new:')) handleCreate(value.slice(4));
              else handleLink(candidates.find((row) => rowKey(row) === value));
              setAdding(false);
            }}>
            {SECTION_KEYS.map((key) => <MenuItem key={`new:${key}`} value={`new:${key}`}>New {TOOL_UI[key].label}</MenuItem>)}
            {candidates.map((row) => <MenuItem key={rowKey(row)} value={rowKey(row)}>{row.name} · {TOOL_UI[row.sectionKey].label}</MenuItem>)}
          </TextField> : <Button startIcon={<Plus size={16} />} variant="outlined" disabled={disabled} onClick={() => setAdding(true)}>Add tool or campaign</Button>}
        </Stack>}
      </DialogContent>
      <DialogActions><Button disabled={working} onClick={() => setOpen(false)}>Close</Button></DialogActions>
    </Dialog>
  </>;
}

export const LINKED_TOOLS_BUTTON_SX = {
  minWidth: { xs: 32, md: 64 }, px: { xs: 0.75, md: 1.25 },
  fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', letterSpacing: '0.08em',
  '& .MuiButton-startIcon': { mr: { xs: 0, md: 1 }, ml: 0 },
};
