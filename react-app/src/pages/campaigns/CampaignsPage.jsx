import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Stack, TextField, MenuItem, Chip, CircularProgress, IconButton, Divider } from '@mui/material';
import { Cloud, Flag, Users, Plus, ScrollText, Copy, LogIn, LogOut, X, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import AuthDialog from '../../shared/cloud/AuthDialog.jsx';
import { useToast } from '../../shared/ToastProvider.jsx';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';
import {
  createCampaign, joinCampaign, listMyCampaigns,
  listCampaignCharacters, listCampaignMembers, setCharacterCampaign, leaveCampaign, deleteCampaign,
} from '../../shared/cloud/campaigns.js';
import { listMyCharacters } from '../../shared/cloud/cloudCharacters.js';
import { summarizeCharacter } from './sheetSummary.js';
import { resolveCampaignsPageState } from './campaignsPageState.js';
import { ensureSheetRuntimeAdapters } from '../charsheet/logic/sheetRuntimeAdapters.js';

export default function CampaignsPage() {
  const { cloudEnabled, status, user, isGm } = useAuth();
  const navigate = useNavigate();
  const myId = user?.id;
  const [campaigns, setCampaigns] = useState([]);
  const [charsByCampaign, setCharsByCampaign] = useState({});
  const [membersByCampaign, setMembersByCampaign] = useState({});
  const [myChars, setMyChars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { notify } = useToast();
  const pageState = resolveCampaignsPageState({ cloudEnabled, status });

  const load = useCallback(async () => {
    if (status !== 'authed') return;
    setLoading(true);
    try {
      const [camps, chars] = await Promise.all([listMyCampaigns(), listMyCharacters()]);
      const charEntries = await Promise.all(camps.map(async (c) => [c.id, await listCampaignCharacters(c.id)]));
      const memEntries = await Promise.all(camps.map(async (c) => [c.id, await listCampaignMembers(c.id)]));
      await ensureSheetRuntimeAdapters(charEntries.flatMap(([, campaignChars]) => (
        (campaignChars || []).map((ch) => ch.data)
      )));
      setCampaigns(camps);
      setMyChars(chars);
      setCharsByCampaign(Object.fromEntries(charEntries));
      setMembersByCampaign(Object.fromEntries(memEntries));
    } catch (e) {
      notify('error', e?.message || 'Failed to load.');
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) { notify('warning', 'Enter a campaign name.'); return; }
    setBusy(true);
    try {
      const c = await createCampaign(newName.trim());
      setNewName('');
      notify('success', `Campaign created. Invite code: ${c.join_code}`);
      await load();
    } catch (e) { notify('error', e?.message || 'Failed to create.'); }
    finally { setBusy(false); }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { notify('warning', 'Enter an invite code.'); return; }
    setBusy(true);
    try {
      const c = await joinCampaign(joinCode.trim());
      setJoinCode('');
      notify('success', `Joined "${c.name}".`);
      await load();
    } catch (e) { notify('error', e?.message || 'Invalid code.'); }
    finally { setBusy(false); }
  };

  // Open campaign rows online. A local copy is created only through "Save local"
  // inside the sheet, so browsing online sheets never fills local storage.
  const openCampaignChar = async (ch, campaign) => {
    const mine = ch.owner === myId;
    const canEdit = mine || isGm || campaign.gm === myId;
    if (!canEdit) { navigate(`/campaign-sheet?id=${encodeURIComponent(ch.id)}`); return; }
    navigate(`/campaign-sheet?id=${encodeURIComponent(ch.id)}&edit=1`);
  };

  const assignChar = async (charId, campaignId) => {
    setBusy(true);
    try { await setCharacterCampaign(charId, campaignId); await load(); }
    catch (e) { notify('error', e?.message || 'Failed to assign.'); }
    finally { setBusy(false); }
  };

  const handleLeave = async (campaignId) => {
    if (!window.confirm('Leave this campaign?')) return;
    setBusy(true);
    try { await leaveCampaign(campaignId); await load(); notify('info', 'Left campaign.'); }
    catch (e) { notify('error', e?.message || 'Failed to leave.'); }
    finally { setBusy(false); }
  };

  const handleDeleteCampaign = async (c) => {
    if (!window.confirm(`Delete campaign "${c.name}"? Members are removed and their sheets are detached (not deleted).`)) return;
    setBusy(true);
    try { await deleteCampaign(c.id); await load(); notify('info', 'Campaign deleted.'); }
    catch (e) { notify('error', e?.message || 'Failed to delete.'); }
    finally { setBusy(false); }
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code).then(() => notify('info', 'Invite code copied.'), () => {});
  };

  return (
    <Box sx={rootSx}>
      <AppTopBar home />
      <Box component="main" sx={pageSx}>
        <Box sx={headerSx}>
          <Box component={Flag} size={30} strokeWidth={1.5} aria-hidden sx={headerIconSx} />
          <Typography component="h1" sx={titleSx}>Campaigns</Typography>
        </Box>

        {pageState === 'unconfigured' ? (
          <Box sx={statePanelSx}>
            <Box component={Cloud} size={28} aria-hidden sx={stateIconSx} />
            <Typography sx={stateTitleSx}>Online features not configured.</Typography>
            <Typography sx={msgSx}>Campaigns require the cloud connection to be configured for this app.</Typography>
          </Box>
        ) : pageState === 'loading' ? (
          <Box sx={statePanelSx}>
            <CircularProgress size={26} />
            <Typography sx={msgSx}>Restoring your session…</Typography>
          </Box>
        ) : pageState === 'signedOut' ? (
          <Box sx={statePanelSx}>
            <Box component={Users} size={30} aria-hidden sx={stateIconSx} />
            <Typography sx={stateTitleSx}>Campaigns live online</Typography>
            <Typography sx={msgSx}>Log in or create an account to create, join, and manage campaigns.</Typography>
            <Button variant="contained" startIcon={<LogIn size={16} />} onClick={() => setAuthOpen(true)}>
              Log in / Sign up
            </Button>
          </Box>
        ) : (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={setupStackSx}>
              <Box component="section" sx={setupPanelSx}>
                <Typography component="h2" sx={sectionTitleSx}>Create a campaign</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField size="small" label="Campaign name" value={newName} onChange={(e) => setNewName(e.target.value)} fullWidth />
                  <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={handleCreate} disabled={busy} sx={setupActionSx}>Create</Button>
                </Stack>
              </Box>
              <Box component="section" sx={setupPanelSx}>
                <Typography component="h2" sx={sectionTitleSx}>Join with a code</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField size="small" label="Invite code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} fullWidth />
                  <Button variant="contained" size="small" startIcon={<Users size={14} />} onClick={handleJoin} disabled={busy} sx={setupActionSx}>Join</Button>
                </Stack>
              </Box>
            </Stack>

            {loading ? <Box sx={listLoadingSx}><CircularProgress size={22} /></Box> : null}
            {!loading && campaigns.length === 0 ? (
              <Box sx={emptyPanelSx}>
                <Typography sx={msgSx}>No campaigns yet. Create one or join with a code.</Typography>
              </Box>
            ) : null}

            <Stack spacing={2}>
              {campaigns.map((c) => {
                const isCampaignGm = c.gm === myId;
                const chars = charsByCampaign[c.id] || [];
                const members = membersByCampaign[c.id] || [];
                // Only MY own characters can be added (a global GM's listMyCharacters
                // returns everyone's sheets via RLS — never offer those).
                const assignable = myChars.filter((mc) => mc.owner === myId && mc.campaign_id !== c.id);
                return (
                  <Box component="article" key={c.id} sx={campaignCardSx}>
                    <Box sx={campaignHeaderSx}>
                      <Box sx={campaignTitleRowSx}>
                        <Typography component="h2" sx={campaignNameSx}>{c.name}</Typography>
                        {isCampaignGm ? <Chip size="small" label="GM" color="primary" variant="outlined" sx={smallChipSx} /> : null}
                        {isCampaignGm ? (
                          <Chip
                            size="small"
                            label={`Code: ${c.join_code}`}
                            onClick={() => copyCode(c.join_code)}
                            icon={<Copy size={12} />}
                            color="primary"
                            variant="outlined"
                            aria-label={`Copy invite code ${c.join_code}`}
                            sx={inviteChipSx}
                          />
                        ) : null}
                      </Box>
                      <Box sx={campaignActionsSx}>
                        <Typography sx={metaSx}>{members.length} member{members.length === 1 ? '' : 's'}</Typography>
                        {isCampaignGm ? (
                          <IconButton size="small" onClick={() => handleDeleteCampaign(c)} title="Delete campaign" aria-label={`Delete campaign ${c.name}`} sx={dangerActionSx}>
                            <Trash2 size={15} />
                          </IconButton>
                        ) : (
                          <IconButton size="small" onClick={() => handleLeave(c.id)} title="Leave" aria-label={`Leave campaign ${c.name}`} sx={dangerActionSx}>
                            <LogOut size={15} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>

                    <Divider sx={campaignDividerSx} />

                    {chars.length === 0 ? (
                      <Typography sx={metaSx}>No sheets in this campaign yet.</Typography>
                    ) : (
                      <Stack spacing={0.75}>
                        {chars.map((ch) => {
                          const mine = ch.owner === myId;
                          // Mirror openCampaignChar: editable by owner, a global GM
                          // (useAuth isGm), or the GM of this campaign.
                          const canEditChar = mine || isGm || isCampaignGm;
                          const s = summarizeCharacter(ch.data);
                          return (
                            <Box key={ch.id} sx={characterRowSx}>
                              <Box component="button" type="button" onClick={() => openCampaignChar(ch, c)} sx={characterOpenButtonSx}>
                                <Box component={ScrollText} size={16} aria-hidden sx={characterIconSx(canEditChar)} />
                                <Box component="span" sx={characterInfoSx}>
                                  <Box component="span" sx={characterNameRowSx}>
                                    <Typography component="span" sx={characterNameSx}>{ch.name || ch.id}</Typography>
                                    {!canEditChar ? (
                                      <Chip component="span" size="small" icon={<Eye size={10} />} label="READ ONLY" sx={readOnlyChipSx} variant="outlined" />
                                    ) : null}
                                  </Box>
                                  <Typography component="span" sx={metaSx}>{ch.owner_username || '—'}{mine ? ' · you' : ''}</Typography>
                                  {s ? (
                                    <Box component="span" sx={statsRowSx}>
                                      <Box component="span" sx={statSx}>HP <Box component="b" sx={hpStatSx}>{s.currentHP}</Box>/{s.maxHP}</Box>
                                      <Box component="span" sx={statSx}>AC <Box component="b" sx={acStatSx}>{s.ac}</Box></Box>
                                      <Box component="span" sx={statSx}>PP <Box component="b" sx={ppStatSx}>{s.passivePerception}</Box></Box>
                                      <Box component="span" sx={statSx}>Init <Box component="b" sx={initStatSx}>{s.initiative >= 0 ? `+${s.initiative}` : s.initiative}</Box></Box>
                                    </Box>
                                  ) : null}
                                </Box>
                              </Box>
                              {mine ? (
                                <IconButton size="small" onClick={() => assignChar(ch.id, null)} title="Remove from campaign" aria-label={`Remove ${ch.name || ch.id} from campaign`} sx={dangerActionSx}>
                                  <X size={15} />
                                </IconButton>
                              ) : null}
                            </Box>
                          );
                        })}
                      </Stack>
                    )}

                    {assignable.length > 0 ? (
                      <TextField
                        select
                        size="small"
                        value=""
                        fullWidth
                        sx={characterSelectSx}
                        label="Add one of my characters"
                        onChange={(e) => assignChar(e.target.value, c.id)}
                        disabled={busy}
                      >
                        {assignable.map((mc) => (
                          <MenuItem key={mc.id} value={mc.id}>{mc.name || mc.id}</MenuItem>
                        ))}
                      </TextField>
                    ) : null}
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
      </Box>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </Box>
  );
}

const focusVisibleSx = { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '2px' };

const rootSx = {
  minHeight: '100vh',
  bgcolor: 'background.default',
  overflowX: 'hidden',
  pt: APP_TOP_BAR_HEIGHT,
};

const pageSx = {
  width: '100%',
  maxWidth: 860,
  mx: 'auto',
  p: { xs: 2, sm: 3, md: 4 },
};

const headerSx = { display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5 };
const headerIconSx = { color: 'primary.main', flexShrink: 0 };
const titleSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: 'clamp(1.3rem, 4vw, 1.7rem)', fontWeight: 800, color: 'primary.main', letterSpacing: '0.06em' };

const statePanelSx = {
  minHeight: 220,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1.25,
  textAlign: 'center',
  p: { xs: 2.5, sm: 4 },
  border: '1px dashed',
  borderColor: 'divider',
  bgcolor: 'background.paper',
};

const stateIconSx = { color: 'primary.main' };
const stateTitleSx = { fontFamily: '"Cinzel", Georgia, serif', color: 'text.primary', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em' };
const msgSx = { color: 'text.secondary', fontSize: '0.9rem', maxWidth: 520 };

const setupStackSx = { mb: 2.5 };
const setupPanelSx = { flex: 1, minWidth: 0, p: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' };
const sectionTitleSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'text.secondary', mb: 1, textTransform: 'uppercase' };
const setupActionSx = { width: { xs: '100%', sm: 'auto' }, flexShrink: 0 };
const listLoadingSx = { display: 'flex', justifyContent: 'center', py: 2 };
const emptyPanelSx = { textAlign: 'center', p: 3, mb: 2, border: '1px dashed', borderColor: 'divider' };

const campaignCardSx = { p: { xs: 1.25, sm: 1.75 }, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' };
const campaignHeaderSx = { display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' };
const campaignTitleRowSx = { minWidth: 0, flex: '1 1 320px', display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' };
const campaignNameSx = { minWidth: 0, fontFamily: '"Cinzel", Georgia, serif', fontSize: '1rem', fontWeight: 700, color: 'text.primary', overflowWrap: 'anywhere' };
const campaignActionsSx = { ml: { xs: 0, sm: 'auto' }, display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 };
const campaignDividerSx = { my: 1.25 };
const smallChipSx = { height: 22, fontSize: '0.62rem', flexShrink: 0 };
const inviteChipSx = { ...smallChipSx, cursor: 'pointer', '&:focus-visible': focusVisibleSx };
const dangerActionSx = { color: 'error.main', flexShrink: 0, '&:focus-visible': focusVisibleSx };

const characterRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  minWidth: 0,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.default',
  transition: 'border-color 0.15s, background-color 0.15s',
  '&:hover, &:focus-within': { borderColor: 'primary.main' },
};

const characterOpenButtonSx = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1,
  p: 1,
  color: 'inherit',
  bgcolor: 'transparent',
  border: 0,
  textAlign: 'left',
  font: 'inherit',
  cursor: 'pointer',
  '&:hover': { bgcolor: 'action.hover' },
  '&:focus-visible': focusVisibleSx,
};

const characterIconSx = (canEdit) => ({ color: canEdit ? 'success.main' : 'gmboard.badge.cloud', flexShrink: 0, mt: 0.25 });
const characterInfoSx = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' };
const characterNameRowSx = { display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flexWrap: 'wrap' };
const characterNameSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.85rem', color: 'text.primary', overflowWrap: 'anywhere' };
const metaSx = { display: 'block', fontSize: '0.72rem', color: 'text.secondary' };
const readOnlyChipSx = { flexShrink: 0, height: 18, fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', letterSpacing: '0.08em', color: 'gmboard.badge.cloud', borderColor: 'gmboard.badge.cloud', '& .MuiChip-icon': { color: 'gmboard.badge.cloud', ml: 0.5 }, '& .MuiChip-label': { px: 0.75 } };
const statsRowSx = { display: 'flex', flexWrap: 'wrap', gap: '0.15rem 0.7rem', mt: 0.4 };
const statSx = { fontSize: '0.68rem', color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'nowrap' };
const hpStatSx = { color: 'error.main' };
const acStatSx = { color: 'primary.main' };
const ppStatSx = { color: 'success.main' };
const initStatSx = { color: 'gmboard.badge.cloud' };
const characterSelectSx = { mt: 1.5, maxWidth: { xs: '100%', sm: 360 } };
