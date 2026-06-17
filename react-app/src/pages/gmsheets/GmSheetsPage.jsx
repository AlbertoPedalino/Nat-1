import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, Typography, Stack, CircularProgress } from '@mui/material';
import { Home, RefreshCw, ScrollText, Download, Trash2, Save } from 'lucide-react';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import CloudMenu from '../../shared/cloud/CloudMenu.jsx';
import AppToast from '../../shared/AppToast.jsx';
import SheetDialog from '../../shared/character/SheetDialog.jsx';
import { listAllCharacters, listMyCharacters, deleteCloudCharacter, pullCharacter } from '../../shared/cloud/cloudCharacters.js';
import { createCharacterExport } from '../charbuilder/logic/characterExport.js';
import { supabase } from '../../shared/cloud/supabaseClient.js';

function fmt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export default function GmSheetsPage() {
  const { cloudEnabled, status, isGm, user } = useAuth();
  const myId = user?.id;
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogRow, setDialogRow] = useState(null);
  const [feedback, setFeedback] = useState(null);
  // On reload `refresh` fires twice: once when the session restores (isGm still
  // false → listMyCharacters) and again when the profile loads (isGm true →
  // listAllCharacters). Without this token guard the earlier, owner-only result
  // can resolve last and clobber the full list — leaving a GM stuck on "No sheets yet".
  const reqRef = useRef(0);

  const refresh = useCallback(async () => {
    if (status !== 'authed') return;
    const token = ++reqRef.current;
    setLoading(true); setError('');
    try {
      // Only a global GM sees every sheet here. Everyone else (incl. a campaign
      // GM) sees just their own — campaign sheets live on the Campaigns page.
      const data = await (isGm ? listAllCharacters() : listMyCharacters());
      if (token === reqRef.current) setRows(data);
    } catch (e) {
      if (token === reqRef.current) setError(e?.message || 'Failed to load.');
    } finally {
      if (token === reqRef.current) setLoading(false);
    }
  }, [status, isGm]);

  useEffect(() => { refresh(); }, [refresh]);

  const openSheet = async (row) => {
    // A global GM can edit everyone's sheets; otherwise only your own. Anything
    // you can't edit opens in the read-only view.
    const canEdit = row.owner === myId || isGm;
    if (!canEdit) {
      navigate(`/campaign-sheet?id=${encodeURIComponent(row.id)}`);
      return;
    }
    navigate(`/campaign-sheet?id=${encodeURIComponent(row.id)}&edit=1`);
  };

  const deleteRow = async (row) => {
    if (!window.confirm(`Delete "${row.name || row.id}" by ${row.owner_username || '—'} from the cloud? This cannot be undone.`)) return;
    try {
      await deleteCloudCharacter(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      setError(e?.message || 'Failed to delete.');
    }
  };

  const downloadJson = async (row) => {
    try {
      const { data, error: err } = await supabase.from('characters').select('data').eq('id', row.id).single();
      if (err) throw err;
      const blob = new Blob([JSON.stringify(createCharacterExport(data.data), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.name || row.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || 'Failed to download.');
    }
  };

  const saveLocal = async (row) => {
    try {
      await pullCharacter(row.id);
      setFeedback({ severity: 'success', msg: `"${row.name || row.id}" saved locally.` });
    } catch (e) {
      setFeedback({ severity: 'error', msg: e?.message || 'Failed to save locally.' });
    }
  };

  return (
    <Box sx={rootSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button component={Link} to="/" size="small" variant="outlined" startIcon={<Home size={14} />} sx={navBtnSx}>
          HOME
        </Button>
        <Typography sx={titleSx}>{isGm ? 'Players sheets' : 'My sheets'}</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          {status === 'authed' ? (
            <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={refresh} sx={navBtnSx}>
              Refresh
            </Button>
          ) : null}
          <CloudMenu buttonSx={navBtnSx} />
        </Box>
      </Box>

      {!cloudEnabled ? (
        <Typography sx={msgSx}>Online features not configured. Set the VITE_SUPABASE_* variables in the .env file.</Typography>
      ) : status === 'loading' ? (
        <CircularProgress size={22} />
      ) : status !== 'authed' ? (
        <Typography sx={msgSx}>Log in to see your sheets.</Typography>
      ) : (
        <>
          {error ? <Typography sx={{ ...msgSx, color: '#de675f' }}>{error}</Typography> : null}
          {loading ? <CircularProgress size={22} /> : null}
          {!loading && rows.length === 0 ? (
            <Typography sx={msgSx}>
              {isGm
                ? "No sheets yet. Players' sheets show up here once they log in and edit."
                : 'No sheets yet. Create a character while logged in and it shows up here.'}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {rows.map((row) => (
                <Box key={row.id} sx={cardSx} onClick={() => openSheet(row)}>
                  <ScrollText size={18} color="#2ecc71" style={{ flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={nameSx}>{row.name || row.id}</Typography>
                    <Typography sx={metaSx}>{row.owner_username || '—'} · {fmt(row.updated_at)}</Typography>
                  </Box>
                  <Button size="small" variant="outlined" startIcon={<Save size={13} />} onClick={(e) => { e.stopPropagation(); setDialogRow(row); }} sx={rowActionBtnSx} title="Save / Export">
                    <Box component="span" sx={btnLabelSx}>SAVE / EXPORT</Box>
                  </Button>
                  <Button size="small" variant="outlined" color="error" onClick={(e) => { e.stopPropagation(); deleteRow(row); }} sx={rowActionBtnSx} title="Delete from cloud">
                    <Trash2 size={14} />
                  </Button>
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}

      <SheetDialog
        open={Boolean(dialogRow)}
        onClose={() => setDialogRow(null)}
        maxWidth="xs"
        title="Save Character"
        icon={<Save size={20} />}
        actions={(
          <Button onClick={() => setDialogRow(null)} variant="outlined" size="small" sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
        )}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 0.5 }}>
          <Button fullWidth variant="outlined" color="secondary" startIcon={<Download size={16} />}
            onClick={() => { downloadJson(dialogRow); setDialogRow(null); }} sx={{ justifyContent: 'flex-start', py: 1 }}>
            Download JSON
          </Button>
          <Button fullWidth variant="contained" color="primary" startIcon={<Save size={16} />}
            onClick={() => { saveLocal(dialogRow); setDialogRow(null); }} sx={{ justifyContent: 'flex-start', py: 1 }}>
            Save local
          </Button>
        </Box>
      </SheetDialog>

      <AppToast toast={feedback} onClose={() => setFeedback(null)} />
    </Box>
  );
}

const rootSx = { minHeight: '100vh', bgcolor: '#0f0e0d', p: { xs: 2, md: 4 }, maxWidth: 820, mx: 'auto' };
const titleSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.2rem', fontWeight: 800, color: '#e8c96a', letterSpacing: '0.04em' };
const navBtnSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.6rem', letterSpacing: '0.06em' };
// Row actions collapse to icon-only on mobile: the label hides under sm and the
// startIcon margin drops so the icon centers in the compact button.
const rowActionBtnSx = {
  ...navBtnSx,
  flexShrink: 0,
  minWidth: { xs: 0, sm: 'auto' },
  px: { xs: 0.9, sm: 1.5 },
  '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 }, ml: 0 },
};
const btnLabelSx = { display: { xs: 'none', sm: 'inline' } };
const msgSx = { color: '#bda98a', fontSize: '0.9rem', mb: 1.5 };
const cardSx = {
  display: 'flex', alignItems: 'center', gap: 1.2, p: 1.2,
  border: '1px solid rgba(180,150,90,0.25)', borderRadius: '10px', bgcolor: '#1a1815',
  cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s',
  '&:hover': { borderColor: 'rgba(180,150,90,0.55)', bgcolor: '#201d18' },
};
const nameSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.92rem', color: '#edd48a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const metaSx = { fontSize: '0.72rem', color: '#7a6a4a' };
