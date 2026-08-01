import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { alpha, Box, Button, Typography, Card, CardContent } from '@mui/material';
import { ScrollText, UserPen, LayoutDashboard, Swords, StickyNote, Trash2 } from 'lucide-react';
import { REGISTRY_META } from '../../shared/localStorageRegistries.js';
import { clearAppLocalStorage, listAppLocalStorageKeys } from '../../shared/storage.js';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';

const TOOLS = [
  { path: '/library/characters', label: 'Character Sheet', desc: 'View and manage your character in play', icon: ScrollText, color: 'success.main' },
  { path: REGISTRY_META.gb_char_registry.newRoute, label: 'Char Builder', desc: 'Create or level up your character', icon: UserPen, color: 'gmboard.rarity.Very Rare' },
  { path: '/library/gmboard', label: 'GM Board', desc: 'Hexcrawl, dungeon, and quest generators', icon: LayoutDashboard, color: 'warning.main' },
  { path: '/library/encounters', label: 'Encounter Builder', desc: 'Build and balance combat encounters', icon: Swords, color: 'error.main' },
  { path: '/library/dmscreen', label: 'DM Screen', desc: 'Keep notes and reminders close during play', icon: StickyNote, color: 'secondary.main' },
];

export default function HomePage() {
  const [clearMessage, setClearMessage] = useState('');
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
