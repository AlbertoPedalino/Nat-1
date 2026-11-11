import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { REGISTRY_META } from '../../shared/storage/localStorageRegistries.js';
import { clearAppLocalStorage, listAppLocalStorageKeys } from '../../shared/storage/storage.js';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../app/navigation/AppTopBar.jsx';
import { confirmAction } from '../../shared/ui/confirmAction.js';
import { useEventListener } from '../../shared/ui/useEventListener.js';
import { UI_COLORS } from '../../shared/ui/colors.js';
import { coverRaysSx, SURFACES } from '../../shared/ui/surfaces.js';
import { INK_EDGE, inkShadow, UI_SHADOWS } from '../../shared/ui/shadows.js';
import { CARD_SX } from '../../shared/ui/interactive.js';
import { panelBadgeSx } from '../../shared/ui/PanelHeader.jsx';
import { bubbleCheerSx } from '../../shared/ui/bubble.js';
import { DURATIONS } from '../../shared/ui/motion.js';
import { UI_FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../shared/ui/fonts.js';
import { TOOL_CATALOG } from '../../app/navigation/toolCatalog.js';
import NatOneDie from './NatOneDie.jsx';
import { useFirstArrival } from './useFirstArrival.js';
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
  const arriving = useFirstArrival();
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
        <NatOneDie sx={heroLogoSx} />
        <Typography component="h1" sx={arriving ? { ...heroTitleSx, ...bubbleCheerSx(HERO_TITLE_TILT) } : heroTitleSx}>Nat-1</Typography>
        <Typography sx={heroEditionSx}>D&D 5.5e</Typography>
      </Box>

      <Box sx={gridSx}>
        {TOOLS.map((tool) => (
          <Box key={tool.path} component={Link} to={tool.path} sx={getCardSx(tool.color)}>
            <Box sx={{ ...panelBadgeSx(tool.color), p: 0.75, borderRadius: 1.5, boxShadow: UI_SHADOWS.press }}>
              <tool.icon size={ICON_SIZES.hero} strokeWidth={1.75} />
            </Box>
            <Typography className="card-label" sx={cardLabelSx}>{tool.label}</Typography>
            <Typography sx={cardDescSx}>{tool.desc}</Typography>
          </Box>
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
  ...SURFACES.page,
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  p: '2rem 1rem',
  pt: `calc(2rem + ${APP_TOP_BAR_HEIGHT})`,
  overflowX: 'hidden',
};

// The cover: the logo, the app's name lettered like a comic's title over a
// sunburst, and the edition on a sticker under it. The name cheers in once.
const heroSx = {
  ...coverRaysSx(UI_COLORS.accent),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  mb: '2.5rem',
};

const heroLogoSx = {
  display: 'block',
  // The logo is drawn inked (outline, shadow, tilt), so it takes no filter.
  width: 'clamp(96px, 18vw, 140px)',
  mb: '0.25rem',
};

// The name's tilt; it cheers into it on arriving on the site (useFirstArrival).
const HERO_TITLE_TILT = 'rotate(-4deg)';

const heroTitleSx = {
  ...TEXT_STYLES.cover,
  transform: HERO_TITLE_TILT,
  fontSize: 'clamp(3.5rem, 12vw, 6.5rem)',
  lineHeight: LINE_HEIGHTS.tight,
  color: UI_COLORS.accent,
};

const heroEditionSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xxl,
  mt: '0.75rem',
  px: 1.5,
  py: 0.25,
  color: UI_COLORS.textPrimary,
  bgcolor: UI_COLORS.surfaceRaised,
  border: INK_EDGE,
  borderRadius: 1,
  boxShadow: inkShadow(),
  transform: 'rotate(2deg)',
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

// A tool's card: the drawn card, its badge in the tool's colour, lifted and
// edged in that colour under the cursor.
function getCardSx(color) {
  return {
    ...CARD_SX,
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    p: '1.75rem 1.5rem 1.5rem',
    transition: `border-color ${DURATIONS.fast}ms ease, box-shadow ${DURATIONS.fast}ms ease, transform ${DURATIONS.fast}ms ease`,
    '&:hover': {
      borderColor: color,
      boxShadow: inkShadow(UI_COLORS.edge, 5),
      transform: 'translate(-2px, -2px)',
    },
    '&:hover .card-label': { color },
    '@media (max-width: 600px)': {
      gap: '0.6rem',
      p: '1.25rem 0.75rem 1rem',
    },
  };
}

const cardLabelSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xxl,
  textAlign: 'center',
  color: UI_COLORS.textPrimary,
  transition: `color ${DURATIONS.fast}ms ease`,
};

const cardDescSx = {
  ...TEXT_STYLES.note,
  fontSize: FONT_SIZES.xl,
  textAlign: 'center',
  lineHeight: LINE_HEIGHTS.normal,
  fontFamily: UI_FONTS.prose,
};

const clearDataWrapSx = {
  mt: '1.5rem',
  minHeight: '42px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.35rem',
};

const clearDataButtonSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xs,
};
