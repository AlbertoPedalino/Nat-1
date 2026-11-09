import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { alpha, Box, Button, Typography, Card, CardContent } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { REGISTRY_META } from '../../shared/storage/localStorageRegistries.js';
import { clearAppLocalStorage, listAppLocalStorageKeys } from '../../shared/storage/storage.js';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../app/navigation/AppTopBar.jsx';
import { confirmAction } from '../../shared/ui/confirmAction.js';
import { useEventListener } from '../../shared/ui/useEventListener.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES } from '../../shared/ui/fonts.js';
import { TOOL_CATALOG } from '../../app/navigation/toolCatalog.js';
import { useToast } from '../../shared/ui/ToastProvider.jsx';
import { TEXT_STYLES } from '../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../shared/ui/iconSizes.js';

const toolLink = (id, path) => {
  const { label, description, icon, color } = TOOL_CATALOG[id];
  return { path, label, desc: description, icon, color };
};

export const TOOLS = [
  toolLink('characters', '/library/characters'),
  toolLink('builder', REGISTRY_META.gb_char_registry.newRoute),
  toolLink('campaigns', '/campaigns'),
  toolLink('gmboard', '/library/gmboard'),
  toolLink('dmscreen', '/library/dmscreen'),
  toolLink('vtt', '/vtt'),
  toolLink('encounters', '/library/encounters'),
  toolLink('compendium', '/compendium'),
];

export default function HomePage() {
  const { notify } = useToast();
  const [appDataCount, setAppDataCount] = useState(0);

  const refreshAppDataCount = useCallback(() => {
    setAppDataCount(listAppLocalStorageKeys().length);
  }, []);

  useEffect(() => {
    refreshAppDataCount();
  }, [refreshAppDataCount]);
  useEventListener(window, 'storage', refreshAppDataCount);

  const handleClearAppData = useCallback(() => {
    const confirmed = confirmAction('Delete all local Nat-1 data in this browser? Characters, boards, encounters and legacy data will be removed.');
    if (!confirmed) return;

    const removed = clearAppLocalStorage();
    setAppDataCount(0);
    notify('success', removed ? `Deleted ${removed} local data ${removed === 1 ? 'entry' : 'entries'}.` : 'No local app data found.');
  }, [notify]);

  return (
    <Box sx={homeRootSx}>
      {/* Home already has the Compendium card. */}
      <AppTopBar compendium={false} />
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

      {appDataCount > 0 ? (
        <Box sx={clearDataWrapSx}>
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<Trash2 size={ICON_SIZES.sm} />}
            onClick={handleClearAppData}
            sx={clearDataButtonSx}
          >
            Clear App Data
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}

const homeRootSx = {
  minHeight: '100vh',
  bgcolor: UI_COLORS.surfaceDarkest,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  p: '2rem 1rem',
  pt: `calc(2rem + ${APP_TOP_BAR_HEIGHT})`,
};

const heroSx = { textAlign: 'center', mb: '3rem' };

const heroTitleSx = {
  ...TEXT_STYLES.title,
  fontSize: 'clamp(2rem, 6vw, 3.5rem)',
  color: UI_COLORS.accentText,
  textShadow: `0 0 40px ${uiAlpha(UI_COLORS.accent, OPACITY.line)}`,
  lineHeight: 1.1,
};

const heroLogoSx = {
  display: 'block',
  width: 'clamp(76px, 15vw, 112px)',
  height: 'auto',
  margin: '0 auto 1rem',
  filter: `drop-shadow(0 0 22px ${uiAlpha(UI_COLORS.success, OPACITY.line)})`,
};

const dividerSx = {
  width: '120px',
  height: '1px',
  background: `linear-gradient(90deg, transparent, ${UI_COLORS.accent}, transparent)`,
  margin: '1.4rem auto 0',
};

const gridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '1.25rem',
  width: '100%',
  maxWidth: '860px',
  '@media (max-width: 600px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    maxWidth: '560px',
    gap: '0.75rem',
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
    borderColor: (theme) => alpha(paletteValue(theme, color), OPACITY.line),
    borderRadius: 1.5,
    bgcolor: UI_COLORS.surfaceDeep,
    backgroundImage: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.12s',
    '&:hover': {
      borderColor: color,
      boxShadow: (theme) => `0 0 24px ${alpha(paletteValue(theme, color), OPACITY.fill)}`,
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
  '@media (max-width: 600px)': {
    gap: '0.6rem',
    p: '1.4rem 0.75rem 1.25rem',
    '&:last-child': { pb: '1.25rem' },
  },
};

const cardLabelSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xxl,
  textAlign: 'center',
  color: UI_COLORS.textSecondary,
  transition: 'color 0.15s',
};

const cardDescSx = {
  fontSize: FONT_SIZES.xl,
  color: UI_COLORS.textFaint,
  textAlign: 'center',
  lineHeight: 1.4,
  fontStyle: 'italic',
  fontFamily: UI_FONTS.prose,
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
  borderColor: uiAlpha(UI_COLORS.danger, OPACITY.edge),
  color: UI_COLORS.danger,
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xs,
  '&:hover': {
    borderColor: UI_COLORS.danger,
    bgcolor: uiAlpha(UI_COLORS.danger, OPACITY.soft),
  },
};

