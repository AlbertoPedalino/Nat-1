import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import { Cloud, Flag, Users, Plus, ScrollText, Copy, LogIn, LogOut, X, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../../shared/cloud/auth/AuthProvider.jsx';
import AuthDialog from '../../shared/cloud/auth/AuthDialog.jsx';
import { useToast } from '../../shared/ui/ToastProvider.jsx';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../app/navigation/AppTopBar.jsx';
import {
  createCampaign, joinCampaign, listMyCampaigns,
  listCampaignCharacters, listCampaignMembers, setCharacterCampaign, leaveCampaign, deleteCampaign,
} from '../../shared/cloud/api/campaigns.js';
import { listMyCharacters } from '../../shared/cloud/api/cloudCharacters.js';
import { summarizeCharacter } from '../../shared/campaign/sheetSummary.js';
import { resolveCampaignsPageState } from './campaignsPageState.js';
import { ensureSheetRuntimeAdapters } from '../../shared/character/sheet/sheetRuntimeAdapters.js';
import { signed } from '../../shared/ui/numberFormat.js';
import { confirmAction } from '../../shared/ui/confirmAction.js';
import { UI_FONTS, FONT_SIZES } from '../../shared/ui/fonts.js';
import { campaignSheetPath } from '../../shared/character/profile/characterRoutes.js';
import { failureMessage } from '../../shared/ui/busyAction.js';
import { captionLabelSx } from '../../shared/ui/PanelHeader.jsx';
import { LoadingLine } from '../../shared/ui/LoadStatus.jsx';
import StatePanel from '../../shared/ui/StatePanel.jsx';
import { TEXT_STYLES } from '../../shared/ui/textStyles.js';

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
      notify('error', failureMessage('Could not load your campaigns.', e));
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
    } catch (e) { notify('error', failureMessage('Could not create the campaign.', e)); }
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
    } catch (e) { notify('error', failureMessage('Could not join: the invite code is not valid.', e)); }
    finally { setBusy(false); }
  };

  // Open campaign rows online. A local copy is created only through "Save local"
  // inside the sheet, so browsing online sheets never fills local storage.
  const openCampaignChar = async (ch, campaign) => {
    const mine = ch.owner === myId;
    const canEdit = mine || isGm || campaign.gm === myId;
    navigate(campaignSheetPath(ch.id, { edit: canEdit }));
  };

  const assignChar = async (charId, campaignId) => {
    setBusy(true);
    try { await setCharacterCampaign(charId, campaignId); await load(); }
    catch (e) { notify('error', failureMessage('Could not assign the character.', e)); }
    finally { setBusy(false); }
  };

  const handleLeave = async (campaignId) => {
    if (!confirmAction('Leave this campaign?')) return;
    setBusy(true);
    try { await leaveCampaign(campaignId); await load(); notify('success', 'Left the campaign.'); }
    catch (e) { notify('error', failureMessage('Could not leave the campaign.', e)); }
    finally { setBusy(false); }
  };

  const handleDeleteCampaign = async (c) => {
    if (!confirmAction(`Delete campaign "${c.name}"? Members are removed and their sheets are detached (not deleted).`)) return;
    setBusy(true);
    try { await deleteCampaign(c.id); await load(); notify('success', `Deleted "${c.name}".`); }
    catch (e) { notify('error', failureMessage('Could not delete the campaign.', e)); }
    finally { setBusy(false); }
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code).then(() => notify('success', 'Invite code copied.'), () => notify('error', 'Could not copy the invite code.'));
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
          <StatePanel icon={Cloud} title="Online features not configured.">
            Campaigns require the cloud connection to be configured for this app.
          </StatePanel>
        ) : pageState === 'loading' ? (
          <StatePanel loading>Restoring your session…</StatePanel>
        ) : pageState === 'signedOut' ? (
          <StatePanel
            icon={Users}
            title="Campaigns live online"
            action={(
              <Button variant="contained" startIcon={<LogIn size={16} />} onClick={() => setAuthOpen(true)}>
                Log in / Sign up
              </Button>
            )}
          >
            Log in or create an account to create, join, and manage campaigns.
          </StatePanel>
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

            {loading ? <LoadingLine centered label="Loading campaigns…" sx={{ py: 2 }} /> : null}
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
                                      <Box component="span" sx={statSx}>Init <Box component="b" sx={initStatSx}>{signed(s.initiative)}</Box></Box>
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
const titleSx = { ...TEXT_STYLES.title, fontSize: 'clamp(1.3rem, 4vw, 1.7rem)', color: 'primary.main' };

const msgSx = { color: 'text.secondary', fontSize: FONT_SIZES.xxl, maxWidth: 520 };

const setupStackSx = { mb: 2.5 };
const setupPanelSx = { flex: 1, minWidth: 0, p: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' };
const sectionTitleSx = { ...captionLabelSx, mb: 1 };
const setupActionSx = { width: { xs: '100%', sm: 'auto' }, flexShrink: 0 };
const emptyPanelSx = { textAlign: 'center', p: 3, mb: 2, border: '1px dashed', borderColor: 'divider' };

const campaignCardSx = { p: { xs: 1.25, sm: 1.75 }, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' };
const campaignHeaderSx = { display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' };
const campaignTitleRowSx = { minWidth: 0, flex: '1 1 320px', display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' };
const campaignNameSx = { minWidth: 0, ...TEXT_STYLES.figure, fontSize: FONT_SIZES.body, color: 'text.primary', overflowWrap: 'anywhere' };
const campaignActionsSx = { ml: { xs: 0, sm: 'auto' }, display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 };
const campaignDividerSx = { my: 1.25 };
const smallChipSx = { height: 22, fontSize: FONT_SIZES.xs, flexShrink: 0 };
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
const characterNameSx = { ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xxl, color: 'text.primary', overflowWrap: 'anywhere' };
const metaSx = { display: 'block', fontSize: FONT_SIZES.md, color: 'text.secondary' };
const readOnlyChipSx = { flexShrink: 0, height: 18, ...TEXT_STYLES.title, fontSize: FONT_SIZES.xxxs, color: 'gmboard.badge.cloud', borderColor: 'gmboard.badge.cloud', '& .MuiChip-icon': { color: 'gmboard.badge.cloud', ml: 0.5 }, '& .MuiChip-label': { px: 0.75 } };
const statsRowSx = { display: 'flex', flexWrap: 'wrap', gap: '0.15rem 0.7rem', mt: 0.4 };
const statSx = { fontSize: FONT_SIZES.sm, color: 'text.secondary', fontFamily: UI_FONTS.mono, whiteSpace: 'nowrap' };
const hpStatSx = { color: 'error.main' };
const acStatSx = { color: 'primary.main' };
const ppStatSx = { color: 'success.main' };
const initStatSx = { color: 'gmboard.badge.cloud' };
const characterSelectSx = { mt: 1.5, maxWidth: { xs: '100%', sm: 360 } };
