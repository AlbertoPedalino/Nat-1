import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { alpha, Box, Button, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import { ScrollText, UserPen, LayoutDashboard, Swords, StickyNote, Pencil, Trash2 } from 'lucide-react';
import {
  readRegistry, deleteRegistryEntry, renameRegistryEntry,
  REGISTRY_META,
} from '../../shared/localStorageRegistries.js';
import { clearAppLocalStorage, listAppLocalStorageKeys } from '../../shared/storage.js';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import { fetchCloudMeta, pullCharacter } from '../../shared/cloud/cloudCharacters.js';

const TOOLS = [
  { path: '/charsheet', label: 'Character Sheet', desc: 'View and manage your character in play', icon: ScrollText, color: 'success.main' },
  { path: REGISTRY_META.gb_char_registry.newRoute, label: 'Char Builder', desc: 'Create or level up your character', icon: UserPen, color: 'gmboard.rarity.Very Rare' },
  { path: REGISTRY_META.gb_board_registry.newRoute, label: 'GM Board', desc: 'Hexcrawl, dungeon, and quest generators', icon: LayoutDashboard, color: 'warning.main' },
  { path: REGISTRY_META.gb_encounter_registry.newRoute, label: 'Encounter Builder', desc: 'Build and balance combat encounters', icon: Swords, color: 'error.main' },
  { path: REGISTRY_META.gb_dmscreen_registry.newRoute, label: 'DM Screen', desc: 'Keep notes and reminders close during play', icon: StickyNote, color: 'secondary.main' },
];

function fmt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

function RecentRow({ entry, meta, onDelete, onRename, onOpen, opening }) {
  const isOpening = opening === entry.id;
  const innerSx = { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', cursor: 'pointer', background: 'none', border: 0, textAlign: 'left', font: 'inherit' };
  const inner = (
    <>
      <Typography sx={recentNameSx}>{entry.name || entry.id}</Typography>
      {isOpening
        ? <CircularProgress size={12} sx={{ color: '#c8a84b', flexShrink: 0 }} />
        : <Typography sx={recentMetaSx}>{fmt(entry.updatedAt)}</Typography>}
    </>
  );
  return (
    <Box sx={recentLinkSx}>
      {onOpen ? (
        <Box component="button" type="button" onClick={() => onOpen(entry)} disabled={isOpening} sx={innerSx}>
          {inner}
        </Box>
      ) : (
        <Box component={Link} to={meta.route(entry.id)} sx={innerSx}>
          {inner}
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
        {onRename && (
          <Box
            component="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRename(entry.id); }}
            sx={recentBtnSx}
            title="Rinomina"
          >
            <Pencil size={14} strokeWidth={1.7} />
          </Box>
        )}
        <Box
          component="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(entry.id); }}
          sx={{ ...recentBtnSx, '&:hover': { borderColor: '#e74c3c', color: '#e74c3c' } }}
          title="Elimina"
        >
          <Trash2 size={14} strokeWidth={1.7} />
        </Box>
      </Box>
    </Box>
  );
}

function RecentPanel({ registryKey, entries, onDelete, onRename, onOpen, opening }) {
  const meta = REGISTRY_META[registryKey];
  if (!entries.length) return null;
  return (
    <Box sx={recentPanelSx}>
      <Typography sx={recentTitleSx}>{meta.label}</Typography>
      {entries.map((entry) => (
        <RecentRow key={entry.id} entry={entry} meta={meta} onDelete={onDelete} onRename={onRename} onOpen={onOpen} opening={opening} />
      ))}
    </Box>
  );
}

function ContinueSection({ refreshKey, onStorageChange }) {
  const [registries, setRegistries] = useState({ boards: [], chars: [], encounters: [], screens: [] });
  const [opening, setOpening] = useState(null);
  const { cloudEnabled, status } = useAuth();
  const navigate = useNavigate();

  const refresh = useCallback(() => {
    setRegistries({
      boards: readRegistry('gb_board_registry'),
      chars: readRegistry('gb_char_registry'),
      encounters: readRegistry('gb_encounter_registry'),
      screens: readRegistry('gb_dmscreen_registry'),
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh, refreshKey]);

  // Opening a character: if logged in, grab a fresher cloud copy first, then open.
  const handleOpenChar = useCallback(async (entry) => {
    const id = entry.id;
    const route = REGISTRY_META.gb_char_registry.route(id);
    if (cloudEnabled && status === 'authed') {
      setOpening(id);
      try {
        const meta = await fetchCloudMeta(id);
        if (meta) {
          const localUpdated = entry.updatedAt || 0;
          const cloudUpdated = Date.parse(meta.updated_at) || 0;
          if (cloudUpdated > localUpdated) await pullCharacter(id);
        }
      } catch (_) { /* offline / not found -> just open local */ }
      setOpening(null);
    }
    navigate(route);
  }, [cloudEnabled, status, navigate]);

  const handleDelete = useCallback((registryKey, id) => {
    if (deleteRegistryEntry(registryKey, id)) {
      refresh();
      onStorageChange?.();
    }
  }, [onStorageChange, refresh]);

  const handleRename = useCallback((registryKey, id) => {
    if (renameRegistryEntry(registryKey, id)) refresh();
  }, [refresh]);

  const { boards, chars, encounters, screens } = registries;
  const hasAny = boards.length > 0 || chars.length > 0 || encounters.length > 0 || screens.length > 0;
  if (!hasAny) return null;

  return (
    <Box sx={continueSectionSx}>
      <Typography sx={continueHeadSx}>Continue</Typography>
      <Box sx={recentWrapSx}>
        <RecentPanel
          registryKey="gb_char_registry"
          entries={chars}
          onDelete={(id) => handleDelete('gb_char_registry', id)}
          onOpen={handleOpenChar}
          opening={opening}
        />
        <RecentPanel
          registryKey="gb_board_registry"
          entries={boards}
          onDelete={(id) => handleDelete('gb_board_registry', id)}
          onRename={(id) => handleRename('gb_board_registry', id)}
        />
        <RecentPanel
          registryKey="gb_encounter_registry"
          entries={encounters}
          onDelete={(id) => handleDelete('gb_encounter_registry', id)}
          onRename={(id) => handleRename('gb_encounter_registry', id)}
        />
        <RecentPanel
          registryKey="gb_dmscreen_registry"
          entries={screens}
          onDelete={(id) => handleDelete('gb_dmscreen_registry', id)}
          onRename={(id) => handleRename('gb_dmscreen_registry', id)}
        />
      </Box>
    </Box>
  );
}

export default function HomePage() {
  const [clearMessage, setClearMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [appDataCount, setAppDataCount] = useState(0);

  const refreshAppDataCount = useCallback(() => {
    setAppDataCount(listAppLocalStorageKeys().length);
  }, []);

  useEffect(() => {
    refreshAppDataCount();
    window.addEventListener('storage', refreshAppDataCount);
    return () => window.removeEventListener('storage', refreshAppDataCount);
  }, [refreshAppDataCount]);

  const handleClearAppData = useCallback(() => {
    const confirmed = window.confirm('Eliminare tutti i dati locali di Nat-1 in questo browser? Personaggi, board, encounter e dati legacy verranno rimossi.');
    if (!confirmed) return;

    const removed = clearAppLocalStorage();
    setRefreshKey((value) => value + 1);
    setAppDataCount(0);
    setClearMessage(removed ? `Deleted ${removed} local data ${removed === 1 ? 'entry' : 'entries'}.` : 'No local app data found.');
  }, []);

  return (
    <Box sx={homeRootSx}>
      <AppTopBar />
      <Box sx={heroSx}>
        <Box component="img" src={`${import.meta.env.BASE_URL}favicon.png`} alt="" sx={heroLogoSx} />
        <Typography sx={heroTitleSx}>Nat-1 D&D 5.5e</Typography>
        <Box sx={dividerSx} />
      </Box>

      <Box sx={gridSx}>
        {TOOLS.map((tool) => (
          <Card
            key={tool.path}
            component={Link}
            to={tool.path}
            variant="outlined"
            sx={getCardSx(tool.color)}
          >
            <CardContent sx={cardContentSx}>
              <Box sx={{ color: tool.color, display: 'flex' }}>
                <tool.icon size={38} strokeWidth={1.5} />
              </Box>
              <Typography sx={cardLabelSx}>{tool.label}</Typography>
              <Typography sx={cardDescSx}>{tool.desc}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <ContinueSection refreshKey={refreshKey} onStorageChange={refreshAppDataCount} />

      {(appDataCount > 0 || clearMessage) ? (
        <Box sx={clearDataWrapSx}>
          {appDataCount > 0 ? (
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<Trash2 size={15} />}
              onClick={handleClearAppData}
              sx={clearDataButtonSx}
            >
              Clear App Data
            </Button>
          ) : null}
          {clearMessage ? (
            <Typography sx={clearDataMessageSx}>{clearMessage}</Typography>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

const homeRootSx = {
  minHeight: '100vh',
  bgcolor: '#0f0e0d',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  p: '2rem 1rem',
  pt: `calc(2rem + ${APP_TOP_BAR_HEIGHT})`,
};

const heroSx = { textAlign: 'center', mb: '3rem' };

const heroTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: 'clamp(2rem, 6vw, 3.5rem)',
  fontWeight: 900,
  letterSpacing: '0.06em',
  color: '#e8c96a',
  textShadow: '0 0 40px rgba(200,168,75,0.35)',
  lineHeight: 1.1,
};

const heroLogoSx = {
  display: 'block',
  width: 'clamp(76px, 15vw, 112px)',
  height: 'auto',
  margin: '0 auto 1rem',
  filter: 'drop-shadow(0 0 22px rgba(110,175,95,0.35))',
};

const dividerSx = {
  width: '120px',
  height: '1px',
  background: 'linear-gradient(90deg, transparent, #c8a84b, transparent)',
  margin: '1.4rem auto 0',
};

const gridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1.25rem',
  width: '100%',
  maxWidth: '560px',
  '@media (max-width: 420px)': {
    gridTemplateColumns: '1fr',
    maxWidth: '320px',
  },
};

function paletteValue(theme, token) {
  return token.split('.').reduce((value, part) => value?.[part], theme.palette) || theme.palette.primary.main;
}

function getCardSx(color) {
  return {
    textDecoration: 'none',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: (theme) => alpha(paletteValue(theme, color), 0.3),
    borderRadius: '12px',
    bgcolor: '#1a1815',
    backgroundImage: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.12s',
    '&:hover': {
      borderColor: color,
      boxShadow: (theme) => `0 0 24px ${alpha(paletteValue(theme, color), 0.15)}`,
      transform: 'translateY(-2px)',
    },
    '&:hover .card-label': { color },
  };
}

const cardContentSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.75rem',
  p: '2rem 1.5rem 1.75rem',
  '&:last-child': { pb: '1.75rem' },
};

const cardLabelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.9rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textAlign: 'center',
  color: '#bda98a',
  transition: 'color 0.15s',
};

const cardDescSx = {
  fontSize: '0.8rem',
  color: '#7a6a4a',
  textAlign: 'center',
  lineHeight: 1.4,
  fontStyle: 'italic',
  fontFamily: '"EB Garamond", Georgia, serif',
};

const continueSectionSx = {
  width: '100%',
  maxWidth: '560px',
  mt: '1.25rem',
  bgcolor: '#1a1815',
  border: '1px solid rgba(180,150,90,0.35)',
  borderRadius: '12px',
  p: '1rem',
};

const continueHeadSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.86rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#e8c96a',
  mb: '0.85rem',
  textAlign: 'center',
};

const recentWrapSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '0.75rem',
};

const recentPanelSx = {
  border: '1px solid rgba(180,150,90,0.18)',
  borderRadius: '10px',
  p: '0.85rem',
  background: 'rgba(0,0,0,0.12)',
};

const recentTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.72rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#b8a87a',
  mb: '0.65rem',
};

const recentLinkSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  p: '0.4rem 0.5rem',
  border: '1px solid rgba(180,150,90,0.18)',
  borderRadius: '8px',
  bgcolor: '#232019',
  fontSize: '0.86rem',
  mb: '0.4rem',
  '&:hover': { borderColor: '#c8a84b' },
};

const recentNameSx = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '0.86rem',
};

const recentMetaSx = {
  color: '#7a6a4a',
  fontSize: '0.72rem',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const recentBtnSx = {
  width: '24px',
  height: '24px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(180,150,90,0.18)',
  borderRadius: '6px',
  background: 'rgba(0,0,0,0.18)',
  color: '#7a6a4a',
  cursor: 'pointer',
  p: 0,
  '&:hover': { borderColor: '#c8a84b', color: '#e8c96a' },
};

const clearDataWrapSx = {
  mt: '1rem',
  minHeight: '42px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.35rem',
};

const clearDataButtonSx = {
  borderColor: 'rgba(222,103,95,0.42)',
  color: '#de675f',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.64rem',
  letterSpacing: '0.08em',
  '&:hover': {
    borderColor: '#de675f',
    bgcolor: 'rgba(222,103,95,0.08)',
  },
};

const clearDataMessageSx = {
  color: '#7a6a4a',
  fontSize: '0.72rem',
  fontFamily: '"EB Garamond", Georgia, serif',
};
