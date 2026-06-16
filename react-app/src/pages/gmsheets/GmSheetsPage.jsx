import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, Typography, Stack, CircularProgress } from '@mui/material';
import { Home, RefreshCw, ScrollText, Download, LogIn, Trash2 } from 'lucide-react';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import AuthDialog from '../../shared/cloud/AuthDialog.jsx';
import { listAllCharacters, pullCharacter, deleteCloudCharacter } from '../../shared/cloud/cloudCharacters.js';
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
  const [authOpen, setAuthOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== 'authed') return;
    setLoading(true); setError('');
    try {
      // RLS scopes this: a player gets only their own rows, a GM gets all.
      setRows(await listAllCharacters());
    } catch (e) {
      setError(e?.message || 'Failed to load.');
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { refresh(); }, [refresh]);

  const openSheet = async (row) => {
    // Own sheet -> editable. Someone else's -> read-only view (no local write,
    // no push, no 403).
    if (row.owner && row.owner !== myId) {
      navigate(`/campaign-sheet?id=${encodeURIComponent(row.id)}`);
      return;
    }
    try {
      await pullCharacter(row.id);
      navigate(`/charsheet?char=${encodeURIComponent(row.id)}`);
    } catch (e) {
      setError(e?.message || 'Failed to open sheet.');
    }
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
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
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

  return (
    <Box sx={rootSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button component={Link} to="/" size="small" variant="outlined" startIcon={<Home size={14} />} sx={navBtnSx}>
          HOME
        </Button>
        <Typography sx={titleSx}>{isGm ? 'Players sheets' : 'My sheets'}</Typography>
        {status === 'authed' ? (
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={refresh} sx={{ ...navBtnSx, ml: 'auto' }}>
            Refresh
          </Button>
        ) : null}
      </Box>

      {!cloudEnabled ? (
        <Typography sx={msgSx}>Online features not configured. Set the VITE_SUPABASE_* variables in the .env file.</Typography>
      ) : status === 'loading' ? (
        <CircularProgress size={22} />
      ) : status !== 'authed' ? (
        <Box>
          <Typography sx={msgSx}>Log in as GM to see the sheets.</Typography>
          <Button variant="contained" size="small" startIcon={<LogIn size={14} />} onClick={() => setAuthOpen(true)}>
            Log in
          </Button>
        </Box>
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
                <Box key={row.id} sx={cardSx}>
                  <ScrollText size={18} color="#2ecc71" style={{ flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={nameSx}>{row.name || row.id}</Typography>
                    <Typography sx={metaSx}>{row.owner_username || '—'} · {fmt(row.updated_at)}</Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => openSheet(row)} sx={navBtnSx}>
                    {row.owner && row.owner !== myId ? 'View' : 'Open'}
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<Download size={13} />} onClick={() => downloadJson(row)} sx={navBtnSx}>
                    JSON
                  </Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => deleteRow(row)} sx={navBtnSx} title="Delete from cloud">
                    <Trash2 size={14} />
                  </Button>
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </Box>
  );
}

const rootSx = { minHeight: '100vh', bgcolor: '#0f0e0d', p: { xs: 2, md: 4 }, maxWidth: 820, mx: 'auto' };
const titleSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.2rem', fontWeight: 800, color: '#e8c96a', letterSpacing: '0.04em' };
const navBtnSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.6rem', letterSpacing: '0.06em' };
const msgSx = { color: '#bda98a', fontSize: '0.9rem', mb: 1.5 };
const cardSx = {
  display: 'flex', alignItems: 'center', gap: 1.2, p: 1.2,
  border: '1px solid rgba(180,150,90,0.25)', borderRadius: '10px', bgcolor: '#1a1815',
};
const nameSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.92rem', color: '#edd48a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const metaSx = { fontSize: '0.72rem', color: '#7a6a4a' };
