import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Stack,
  TextField,
  Chip,
  Divider,
} from '@mui/material';
import { Cloud, Flag, Users, Plus, ScrollText, Copy, LogIn, LogOut, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../../shared/cloud/auth/AuthProvider.jsx';
import AuthDialog from '../../shared/cloud/auth/AuthDialog.jsx';
import { useToast } from '../../shared/ui/ToastProvider.jsx';
import AppPage from '../../app/navigation/AppPage.jsx';
import PageHeader from '../../shared/ui/PageHeader.jsx';
import EntityRow from '../../shared/ui/EntityRow.jsx';
import TipIconButton from '../../shared/ui/TipIconButton.jsx';
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
import { SURFACES } from '../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../shared/ui/controlHeights.js';
import TagChip from '../../shared/ui/TagChip.jsx';
import { UI_COLORS } from '../../shared/ui/colors.js';
import EmptyLine from '../../shared/ui/EmptyLine.jsx';
import SelectField from '../../shared/ui/SelectField.jsx';
import { TEXT_STYLES } from '../../shared/ui/textStyles.js';
import { focusRingSx } from '../../shared/ui/interactive.js';
import { CloseButton } from '../../shared/ui/CornerCloseButton.jsx';

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
    <AppPage
      topBar={{ home: true }}
      maxWidth={860}
      sx={{ overflowX: 'hidden' }}
      after={<AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />}
    >
      <PageHeader icon={Flag} title="Campaigns" />

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
            <Button variant="contained" startIcon={<LogIn size={ICON_SIZES.md} />} onClick={() => setAuthOpen(true)}>
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
                <Button variant="contained" size="small" startIcon={<Plus size={ICON_SIZES.sm} />} onClick={handleCreate} disabled={busy} sx={setupActionSx}>Create</Button>
              </Stack>
            </Box>
            <Box component="section" sx={setupPanelSx}>
              <Typography component="h2" sx={sectionTitleSx}>Join with a code</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField size="small" label="Invite code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} fullWidth />
                <Button variant="contained" size="small" startIcon={<Users size={ICON_SIZES.sm} />} onClick={handleJoin} disabled={busy} sx={setupActionSx}>Join</Button>
              </Stack>
            </Box>
          </Stack>

          {loading ? <LoadingLine centered label="Loading campaigns…" sx={{ py: 2 }} /> : null}
          {!loading && campaigns.length === 0 ? (
            <StatePanel title="No campaigns yet">Create one or join with a code.</StatePanel>
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
                      {isCampaignGm ? <TagChip label="GM" tone={UI_COLORS.accent} /> : null}
                      {isCampaignGm ? (
                        <Chip
                          size="small"
                          label={`Code: ${c.join_code}`}
                          onClick={() => copyCode(c.join_code)}
                          icon={<Copy size={ICON_SIZES.xs} />}
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
                        <TipIconButton danger size="small" onClick={() => handleDeleteCampaign(c)} title="Delete campaign" ariaLabel={`Delete campaign ${c.name}`}>
                          <Trash2 size={ICON_SIZES.sm} />
                        </TipIconButton>
                      ) : (
                        <TipIconButton danger size="small" onClick={() => handleLeave(c.id)} title="Leave" ariaLabel={`Leave campaign ${c.name}`}>
                          <LogOut size={ICON_SIZES.sm} />
                        </TipIconButton>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={campaignDividerSx} />

                  {chars.length === 0 ? (
                    <EmptyLine>No sheets in this campaign yet.</EmptyLine>
                  ) : (
                    <Stack spacing={0.75}>
                      {chars.map((ch) => {
                        const mine = ch.owner === myId;
                        // Mirror openCampaignChar: editable by owner, a global GM
                        // (useAuth isGm), or the GM of this campaign.
                        const canEditChar = mine || isGm || isCampaignGm;
                        const s = summarizeCharacter(ch.data);
                        return (
                          <EntityRow
                            key={ch.id}
                            surface="card"
                            wrap
                            onClick={() => openCampaignChar(ch, c)}
                            leading={<Box component={ScrollText} size={16} aria-hidden sx={characterIconSx(canEditChar)} />}
                            title={ch.name || ch.id}
                            badge={!canEditChar ? (
                              <TagChip component="span" icon={<Eye size={ICON_SIZES.xxs} />} label="Read only" tone={UI_COLORS.infoText} />
                            ) : null}
                            subtitle={`${ch.owner_username || '—'}${mine ? ' · you' : ''}`}
                            actions={mine ? (
                              <CloseButton danger onClose={() => assignChar(ch.id, null)} label={`Remove ${ch.name || ch.id} from campaign`} iconSize={ICON_SIZES.sm} />
                            ) : null}
                          >
                            {s ? (
                              <Box component="span" sx={statsRowSx}>
                                <Box component="span" sx={statSx}>HP <Box component="b" sx={hpStatSx}>{s.currentHP}</Box>/{s.maxHP}</Box>
                                <Box component="span" sx={statSx}>AC <Box component="b" sx={acStatSx}>{s.ac}</Box></Box>
                                <Box component="span" sx={statSx}>PP <Box component="b" sx={ppStatSx}>{s.passivePerception}</Box></Box>
                                <Box component="span" sx={statSx}>Init <Box component="b" sx={initStatSx}>{signed(s.initiative)}</Box></Box>
                              </Box>
                            ) : null}
                          </EntityRow>
                        );
                      })}
                    </Stack>
                  )}

                  {assignable.length > 0 ? (
                    <SelectField
                      value=""
                      sx={characterSelectSx}
                      label="Add one of my characters"
                      options={assignable.map((mc) => ({ value: mc.id, label: mc.name || mc.id }))}
                      onChange={(value) => assignChar(value, c.id)}
                      disabled={busy}
                    />
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        </>
      )}
    </AppPage>
  );
}

const setupStackSx = { mb: 2.5 };
const setupPanelSx = { ...SURFACES.panel, flex: 1, minWidth: 0, p: 1.5 };
const sectionTitleSx = { ...captionLabelSx, mb: 1 };
const setupActionSx = { width: { xs: '100%', sm: 'auto' }, flexShrink: 0 };

const campaignCardSx = { ...SURFACES.panel, p: { xs: 1.25, sm: 1.75 } };
const campaignHeaderSx = { display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' };
const campaignTitleRowSx = { minWidth: 0, flex: '1 1 320px', display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' };
const campaignNameSx = { minWidth: 0, ...TEXT_STYLES.figure, fontSize: FONT_SIZES.body, color: 'text.primary', overflowWrap: 'anywhere' };
const campaignActionsSx = { ml: { xs: 0, sm: 'auto' }, display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 };
const campaignDividerSx = { my: 1.25 };
const smallChipSx = { height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.xs, flexShrink: 0 };
const inviteChipSx = { ...smallChipSx, cursor: 'pointer', ...focusRingSx() };

const characterIconSx = (canEdit) => ({ color: canEdit ? 'success.main' : 'gmboard.badge.cloud', flexShrink: 0 });
const metaSx = { display: 'block', fontSize: FONT_SIZES.md, color: 'text.secondary' };
const statsRowSx = { display: 'flex', flexWrap: 'wrap', gap: '0.15rem 0.7rem', mt: 0.5 };
const statSx = { fontSize: FONT_SIZES.sm, color: 'text.secondary', fontFamily: UI_FONTS.mono, whiteSpace: 'nowrap' };
const hpStatSx = { color: 'error.main' };
const acStatSx = { color: 'primary.main' };
const ppStatSx = { color: 'success.main' };
const initStatSx = { color: 'gmboard.badge.cloud' };
const characterSelectSx = { mt: 1.5, maxWidth: { xs: '100%', sm: 360 } };
