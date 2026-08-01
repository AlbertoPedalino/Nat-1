import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { LayoutDashboard, Link2, Network, Plus, StickyNote, Swords, Unlink } from 'lucide-react';
import { useAuth } from '../shared/cloud/AuthProvider.jsx';
import { getCloudSection } from '../shared/cloud/cloudSections.js';
import {
  linkedNewRoute,
  makeLinkGroupId,
  mergeLinkedInstanceRows,
  normalizeLinkGroupId,
  readLocalToolInstances,
  resolveGroupMerge,
  setLocalInstanceLink,
} from '../shared/instanceLinks.js';
import { SECTION_KEYS, SECTION_REGISTRY } from '../shared/sectionRegistry.js';
import { useToast } from '../shared/ToastProvider.jsx';

const TOOL_UI = {
  gmboard: { label: 'GM Board', icon: LayoutDashboard },
  encounters: { label: 'Encounter Builder', icon: Swords },
  dmscreen: { label: 'DM Screen', icon: StickyNote },
};

export default function LinkedToolsMenu({ sectionKey, instanceId, instanceSaved, initialLinkGroupId }) {
  const navigate = useNavigate();
  const { cloudEnabled, status } = useAuth();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [cloudMeta, setCloudMeta] = useState(null);
  const [checkingCloud, setCheckingCloud] = useState(false);

  useEffect(() => {
    let active = true;
    if (instanceSaved || !cloudEnabled || status !== 'authed') {
      setCloudMeta(null);
      setCheckingCloud(false);
      return () => { active = false; };
    }
    setCheckingCloud(true);
    getCloudSection(sectionKey).fetchInstanceMeta(instanceId)
      .then((meta) => { if (active) setCloudMeta(meta?.id ? meta : null); })
      .catch(() => { if (active) setCloudMeta(null); })
      .finally(() => { if (active) setCheckingCloud(false); });
    return () => { active = false; };
  }, [cloudEnabled, instanceId, instanceSaved, sectionKey, status]);

  const persistent = instanceSaved || Boolean(cloudMeta);

  const loadRows = useCallback(async () => {
    const localRows = readLocalToolInstances();
    const canUseCloud = cloudEnabled && status === 'authed';
    if (!canUseCloud) {
      setRows(localRows);
      setError('');
      return localRows;
    }

    const results = await Promise.allSettled(SECTION_KEYS.map((key) => getCloudSection(key).listInstances()));
    const merged = SECTION_KEYS.flatMap((key, index) => mergeLinkedInstanceRows(
      key,
      results[index].status === 'fulfilled' ? results[index].value : [],
      localRows.filter((row) => row.sectionKey === key),
    ));
    setRows(merged);
    setError(results.some((result) => result.status === 'rejected')
      ? 'Some cloud instances could not be loaded; local saves are still available.'
      : '');
    return merged;
  }, [cloudEnabled, status]);

  const handleOpenDialog = async () => {
    if (!persistent) return;
    setOpen(true);
    setLoading(true);
    try {
      await loadRows();
    } finally {
      setLoading(false);
    }
  };

  const current = rows.find((row) => row.sectionKey === sectionKey && row.id === instanceId) || null;
  const groupId = normalizeLinkGroupId(
    current ? current.linkGroupId : (initialLinkGroupId || cloudMeta?.link_group_id),
  );
  const linkedRows = useMemo(() => rows.filter((row) => (
    groupId
    && normalizeLinkGroupId(row.linkGroupId) === groupId
    && !(row.sectionKey === sectionKey && row.id === instanceId)
  )), [groupId, instanceId, rows, sectionKey]);
  const candidates = useMemo(() => rows.filter((row) => (
    !(row.sectionKey === sectionKey && row.id === instanceId)
    && (!groupId || normalizeLinkGroupId(row.linkGroupId) !== groupId)
  )), [groupId, instanceId, rows, sectionKey]);

  const updateMember = useCallback(async (row, nextGroupId) => {
    if (row.hasLocal) setLocalInstanceLink(row.sectionKey, row.id, nextGroupId);
    if (!cloudEnabled || status !== 'authed') return;
    const api = getCloudSection(row.sectionKey);
    if (row.origin === 'cloud') await api.setLinkGroup(row.id, nextGroupId);
    else if (row.hasLocal) await api.pushInstance(row.id);
  }, [cloudEnabled, status]);

  const applyGroup = useCallback(async (members, nextGroupId) => {
    setWorking(true);
    setError('');
    try {
      for (const member of members) await updateMember(member, nextGroupId);
      await loadRows();
      return true;
    } catch (cause) {
      setError(cause?.message || 'Could not update the linked-tools group.');
      return false;
    } finally {
      setWorking(false);
    }
  }, [loadRows, updateMember]);

  const handleLink = async (target) => {
    const active = current || {
      id: instanceId,
      sectionKey,
      linkGroupId: groupId,
      origin: 'local',
      hasLocal: true,
    };
    const plan = resolveGroupMerge(active, target, rows);
    if (plan.mergesGroups && !window.confirm('These instances already belong to different groups. Merge both groups?')) return;
    const ok = await applyGroup(plan.members, plan.groupId);
    if (ok) notify('success', plan.mergesGroups ? 'Linked-tool groups merged.' : 'Instance linked.');
  };

  const handleUnlink = async () => {
    if (!current || !groupId) return;
    const remaining = linkedRows;
    const members = remaining.length === 1 ? [current, remaining[0]] : [current];
    const ok = await applyGroup(members, null);
    if (ok) notify('success', 'Instance unlinked.');
  };

  const handleCreate = async (targetSectionKey) => {
    const nextGroupId = groupId || makeLinkGroupId();
    if (!groupId) {
      const active = current || {
        id: instanceId,
        sectionKey,
        origin: 'local',
        hasLocal: true,
      };
      if (!await applyGroup([active], nextGroupId)) return;
    }
    setOpen(false);
    navigate(linkedNewRoute(targetSectionKey, nextGroupId));
  };

  const button = (
    <Button
      size="small"
      variant={groupId ? 'contained' : 'outlined'}
      color="primary"
      startIcon={<Network size={14} />}
      disabled={!persistent || checkingCloud}
      onClick={handleOpenDialog}
      aria-label="Linked tools"
      sx={topButtonSx}
    >
      <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>LINKS</Box>
    </Button>
  );

  return (
    <>
      {persistent && !checkingCloud ? button : (
        <Tooltip title={checkingCloud ? 'Checking cloud save…' : 'Save this draft before linking it to other tools.'}>
          <span style={{ display: 'inline-flex' }}>{button}</span>
        </Tooltip>
      )}
      <Dialog open={open} onClose={() => !working && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Linked tools</DialogTitle>
        <DialogContent dividers>
          {loading ? <Box sx={centerSx}><CircularProgress size={24} /></Box> : (
            <Stack spacing={2}>
              {error ? <Typography color="error" variant="body2">{error}</Typography> : null}
              <Section title="Linked instances">
                {linkedRows.length ? linkedRows.map((row) => (
                  <InstanceButton
                    key={`${row.sectionKey}:${row.id}`}
                    row={row}
                    icon="open"
                    disabled={working}
                    to={SECTION_REGISTRY[row.sectionKey].route(row.id)}
                    onClick={() => setOpen(false)}
                  />
                )) : <EmptyText>No other tools are linked yet.</EmptyText>}
              </Section>
              <Divider />
              <Section title="Create and link">
                <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {SECTION_KEYS.map((key) => {
                    const Icon = TOOL_UI[key].icon;
                    return (
                      <Button key={key} size="small" variant="outlined" startIcon={<Icon size={14} />} disabled={working} onClick={() => handleCreate(key)}>
                        New {TOOL_UI[key].label}
                      </Button>
                    );
                  })}
                </Stack>
              </Section>
              <Divider />
              <Section title="Link an existing instance">
                <Stack spacing={0.75} sx={{ maxHeight: 240, overflowY: 'auto' }}>
                  {candidates.length ? candidates.map((row) => (
                    <InstanceButton
                      key={`${row.sectionKey}:${row.id}`}
                      row={row}
                      disabled={working}
                      onClick={() => handleLink(row)}
                    />
                  )) : <EmptyText>No other saved instances are available.</EmptyText>}
                </Stack>
              </Section>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {groupId ? (
            <Button color="error" startIcon={<Unlink size={14} />} disabled={working} onClick={handleUnlink} sx={{ mr: 'auto' }}>
              Unlink this instance
            </Button>
          ) : null}
          <Button disabled={working} onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Section({ title, children }) {
  return (
    <Stack spacing={1}>
      <Typography sx={sectionTitleSx}>{title}</Typography>
      {children}
    </Stack>
  );
}

function EmptyText({ children }) {
  return <Typography variant="body2" color="text.secondary">{children}</Typography>;
}

function InstanceButton({ row, onClick, disabled, icon = 'link', to }) {
  const meta = TOOL_UI[row.sectionKey];
  const Icon = meta.icon;
  return (
    <Button
      {...(to ? {
        component: RouterLink,
        to,
        target: '_blank',
        rel: 'noopener noreferrer',
      } : {})}
      variant="outlined"
      color="inherit"
      disabled={disabled}
      onClick={onClick}
      startIcon={icon === 'open' ? <Icon size={15} /> : <Link2 size={15} />}
      sx={instanceButtonSx}
    >
      <Box sx={{ minWidth: 0, textAlign: 'left' }}>
        <Typography component="span" sx={{ display: 'block', fontSize: '0.82rem' }}>{row.name}</Typography>
        <Typography component="span" sx={{ display: 'block', fontSize: '0.66rem', color: 'text.secondary' }}>
          {meta.label} · {row.origin === 'cloud' ? 'Cloud' : 'Local'}
        </Typography>
      </Box>
    </Button>
  );
}

const topButtonSx = {
  minWidth: { xs: 32, md: 64 },
  px: { xs: 0.75, md: 1.25 },
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
  '& .MuiButton-startIcon': { mr: { xs: 0, md: 1 }, ml: 0 },
};

const centerSx = { display: 'flex', justifyContent: 'center', py: 4 };
const sectionTitleSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'primary.main' };
const instanceButtonSx = { justifyContent: 'flex-start', textTransform: 'none', px: 1.25, py: 0.75 };
