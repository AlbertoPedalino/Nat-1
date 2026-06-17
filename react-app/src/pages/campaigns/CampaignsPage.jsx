import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, Typography, Stack, TextField, MenuItem, Chip, CircularProgress, Snackbar, Alert, IconButton, Divider, useMediaQuery, useTheme } from '@mui/material';
import { Home, Users, Plus, LogIn, Eye, ScrollText, Copy, LogOut, X, Trash2 } from 'lucide-react';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import AuthDialog from '../../shared/cloud/AuthDialog.jsx';
import {
  createCampaign, joinCampaign, listMyCampaigns,
  listCampaignCharacters, listCampaignMembers, setCharacterCampaign, leaveCampaign, deleteCampaign,
} from '../../shared/cloud/campaigns.js';
import { listMyCharacters } from '../../shared/cloud/cloudCharacters.js';
import { summarizeCharacter } from './sheetSummary.js';
import { ensureSheetRuntimeAdapters } from '../charsheet/logic/sheetRuntimeAdapters.js';

export default function CampaignsPage() {
  const { cloudEnabled, status, user, isGm } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
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
  const [toast, setToast] = useState(null);

  const notify = (severity, msg) => setToast({ severity, msg });

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button component={Link} to="/" size="small" variant="outlined" startIcon={<Home size={14} />} sx={navBtnSx}>HOME</Button>
        <Typography sx={titleSx}>Campaigns</Typography>
      </Box>

      {!cloudEnabled ? (
        <Typography sx={msgSx}>Online features not configured.</Typography>
      ) : status === 'loading' ? (
        <CircularProgress size={22} />
      ) : status !== 'authed' ? (
        <Box>
          <Typography sx={msgSx}>Log in to manage campaigns.</Typography>
          <Button variant="contained" size="small" startIcon={<LogIn size={14} />} onClick={() => setAuthOpen(true)}>Log in</Button>
        </Box>
      ) : (
        <>
          {/* Create + Join */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
            <Box sx={boxSx}>
              <Typography sx={boxTitleSx}>Create a campaign</Typography>
              <Stack direction="row" spacing={1}>
                <TextField size="small" placeholder="Campaign name" value={newName} onChange={(e) => setNewName(e.target.value)} fullWidth />
                <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={handleCreate} disabled={busy}>Create</Button>
              </Stack>
            </Box>
            <Box sx={boxSx}>
              <Typography sx={boxTitleSx}>Join with a code</Typography>
              <Stack direction="row" spacing={1}>
                <TextField size="small" placeholder="INVITE CODE" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} fullWidth />
                <Button variant="contained" size="small" startIcon={<Users size={14} />} onClick={handleJoin} disabled={busy}>Join</Button>
              </Stack>
            </Box>
          </Stack>

          {loading ? <CircularProgress size={22} /> : null}
          {!loading && campaigns.length === 0 ? (
            <Typography sx={msgSx}>No campaigns yet. Create one or join with a code.</Typography>
          ) : null}

          <Stack spacing={2}>
            {campaigns.map((c) => {
              const isGm = c.gm === myId;
              const chars = charsByCampaign[c.id] || [];
              const members = membersByCampaign[c.id] || [];
              // Only MY own characters can be added (a global GM's listMyCharacters
              // returns everyone's sheets via RLS — never offer those).
              const assignable = myChars.filter((mc) => mc.owner === myId && mc.campaign_id !== c.id);
              return (
                <Box key={c.id} sx={cardSx}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={campNameSx}>{c.name}</Typography>
                    {isGm ? <Chip size="small" label="GM" sx={chipSx} /> : null}
                    {isGm ? (
                      <Chip size="small" label={`Code: ${c.join_code}`} onClick={() => copyCode(c.join_code)}
                        icon={<Copy size={12} />} sx={{ ...chipSx, cursor: 'pointer' }} />
                    ) : null}
                    <Typography sx={{ ...metaSx, ml: 'auto' }}>{members.length} member{members.length === 1 ? '' : 's'}</Typography>
                    {isGm ? (
                      <IconButton size="small" onClick={() => handleDeleteCampaign(c)} title="Delete campaign" sx={{ color: '#de675f' }}>
                        <Trash2 size={14} />
                      </IconButton>
                    ) : (
                      <IconButton size="small" onClick={() => handleLeave(c.id)} title="Leave" sx={{ color: '#de675f' }}>
                        <LogOut size={14} />
                      </IconButton>
                    )}
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  {chars.length === 0 ? (
                    <Typography sx={metaSx}>No sheets in this campaign yet.</Typography>
                  ) : (
                    <Stack spacing={0.75}>
                      {chars.map((ch) => {
                        const mine = ch.owner === myId;
                        const canEditChar = mine || isGm || c.gm === myId;
                        const s = summarizeCharacter(ch.data);
                        return (
                          <Box key={ch.id} sx={rowSx}>
                            <ScrollText size={15} color={canEditChar ? '#2ecc71' : '#7a9bd6'} style={{ flexShrink: 0, alignSelf: 'flex-start', marginTop: 3 }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={rowNameSx}>{ch.name || ch.id}</Typography>
                              <Typography sx={metaSx}>{ch.owner_username || '—'}{mine ? ' · you' : ''}</Typography>
                              {s ? (
                                <Box sx={statsRowSx}>
                                  <Box component="span" sx={statSx}>HP <b style={{ color: '#e07a7a' }}>{s.currentHP}</b>/{s.maxHP}</Box>
                                  <Box component="span" sx={statSx}>AC <b style={{ color: '#edd48a' }}>{s.ac}</b></Box>
                                  <Box component="span" sx={statSx}>PP <b style={{ color: '#9cc79c' }}>{s.passivePerception}</b></Box>
                                  <Box component="span" sx={statSx}>Init <b style={{ color: '#9ec5e6' }}>{s.initiative >= 0 ? `+${s.initiative}` : s.initiative}</b></Box>
                                </Box>
                              ) : null}
                            </Box>
                            {canEditChar ? (
                              <Button size="small" variant="outlined" onClick={() => openCampaignChar(ch, c)} disabled={busy} sx={navBtnSx}>Open</Button>
                            ) : (
                              <Button size="small" variant="outlined" startIcon={<Eye size={13} />} onClick={() => navigate(`/campaign-sheet?id=${encodeURIComponent(ch.id)}`)} sx={navBtnSx}>View</Button>
                            )}
                            {mine ? (
                              <IconButton size="small" onClick={() => assignChar(ch.id, null)} title="Remove from campaign" sx={{ color: '#de675f' }}>
                                <X size={14} />
                              </IconButton>
                            ) : null}
                          </Box>
                        );
                      })}
                    </Stack>
                  )}

                  {assignable.length > 0 ? (
                    <TextField
                      select size="small" value="" sx={{ mt: 1.25, minWidth: 220 }}
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

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      <Snackbar open={Boolean(toast)} autoHideDuration={4000}
        onClose={(_, reason) => { if (reason !== 'clickaway') setToast(null); }}
        disableWindowBlurListener
        anchorOrigin={isDesktop ? { vertical: 'top', horizontal: 'right' } : { vertical: 'bottom', horizontal: 'center' }}
        sx={{ top: isDesktop ? 104 : undefined }}>
        {toast ? <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ fontSize: '0.78rem' }}>{toast.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

const rootSx = { minHeight: '100vh', bgcolor: '#0f0e0d', p: { xs: 2, md: 4 }, maxWidth: 860, mx: 'auto' };
const titleSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.2rem', fontWeight: 800, color: '#e8c96a', letterSpacing: '0.04em' };
const navBtnSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.6rem', letterSpacing: '0.06em' };
const msgSx = { color: '#bda98a', fontSize: '0.9rem', mb: 1.5 };
const boxSx = { flex: 1, p: 1.5, border: '1px solid rgba(180,150,90,0.25)', borderRadius: '10px', bgcolor: '#1a1815' };
const boxTitleSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.72rem', letterSpacing: '0.08em', color: '#b8a87a', mb: 1, textTransform: 'uppercase' };
const cardSx = { p: 1.5, border: '1px solid rgba(180,150,90,0.3)', borderRadius: '12px', bgcolor: '#1a1815' };
const campNameSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '1rem', fontWeight: 700, color: '#edd48a' };
const chipSx = { height: 20, fontSize: '0.6rem', bgcolor: 'rgba(202,165,80,0.12)', borderColor: 'rgba(202,165,80,0.35)', color: '#e8c96a' };
const rowSx = { display: 'flex', alignItems: 'flex-start', gap: 1, p: 0.75, border: '1px solid rgba(180,150,90,0.15)', borderRadius: '8px', bgcolor: '#232019' };
const rowNameSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.85rem', color: '#edd48a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const metaSx = { fontSize: '0.7rem', color: '#7a6a4a' };
const statsRowSx = { display: 'flex', flexWrap: 'wrap', gap: '0.15rem 0.7rem', mt: 0.4 };
const statSx = { fontSize: '0.68rem', color: '#9a8a66', fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'nowrap' };
