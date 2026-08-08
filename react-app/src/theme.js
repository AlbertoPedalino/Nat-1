import { createTheme } from '@mui/material';

// Portalled controls must remain descendants of the browser's fullscreen
// element or they are not painted at all. Outside fullscreen this is exactly
// MUI's normal document.body destination.
function activePortalContainer() {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement || document.webkitFullscreenElement || document.body;
}
import { chipTintStyle } from './shared/entityColors.js';
import { VTT_COLORS, vttAlpha } from './shared/vtt/colors.js';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#151411',
      paper: '#211d18',
    },
    primary: {
      main: '#d7ad52',
      contrastText: '#17120d',
    },
    secondary: {
      main: '#70b7a6',
    },
    error: {
      main: '#de675f',
    },
    warning: {
      main: '#d69245',
    },
    success: {
      main: '#58b879',
    },
    text: {
      primary: '#f0e6d4',
      secondary: '#bda98a',
    },
    divider: 'rgba(215, 173, 82, 0.22)',
    // Default token color for player-character combatants without a custom color.
    pcToken: '#5c8fe0',
    // GM Board semantic tokens: tier/difficulty/rarity distinctions and panel
    // overlay tints, kept here so components consume theme.sx tokens instead
    // of scattering literal hex/rgba values.
    gmboard: {
      tier: {
        1: { border: '#c04040', color: '#ff8080', dim: '#8b3030' },
        2: { border: '#c07030', color: '#ffb060', dim: '#7a5530' },
        3: { border: '#b0a030', color: '#ffe060', dim: '#7a7030' },
        4: { border: '#40a0a0', color: '#a0ffff', dim: '#507878' },
      },
      difficulty: {
        High: '#e06050',
        Moderate: '#e0b060',
        Low: '#7ab870',
      },
      rarity: {
        Legendary: '#e8a030',
        'Very Rare': '#a070d0',
        Rare: '#4080c0',
        Uncommon: '#50a850',
        Common: '#7a6040',
        '—': '#7a6040',
      },
      // Origin badges in the instance picker (cloud vs local-only sheets).
      badge: {
        cloud: '#7ec8e3',
      },
      panelOverlay: 'rgba(0,0,0,0.2)',
      headerOverlay: 'rgba(0,0,0,0.3)',
      rowDivider: 'rgba(180,150,90,0.12)',
      weather: {
        Clear: '#d7ad52',
        Rain: '#70a0ff',
        Snow: '#a0ffff',
      },
      result: {
        encounter: '#e06050',
        loot: '#e8a030',
        camp: '#7ab870',
        environment: '#d69245',
        trap: '#c04040',
        none: '#7a6040',
        trigger: '#d7ad52',
        safe: '#58b879',
      },
      // Battle-map chrome. Canvas drawing colours stay next to the rendering
      // code because they are pixels, while reusable surfaces and status
      // colours belong here so every VTT control changes as one theme.
      vtt: {
        gold: VTT_COLORS.gold,
        goldBright: VTT_COLORS.goldBright,
        goldBorder: vttAlpha(VTT_COLORS.gold, 0.25),
        goldBorderStrong: vttAlpha(VTT_COLORS.gold, 0.42),
        goldTint: vttAlpha(VTT_COLORS.gold, 0.16),
        goldWash: vttAlpha(VTT_COLORS.gold, 0.08),
        surface: vttAlpha(VTT_COLORS.ink, 0.9),
        surfaceSolid: VTT_COLORS.ink,
        backdrop: vttAlpha(VTT_COLORS.black, 0.62),
        inset: vttAlpha(VTT_COLORS.black, 0.3),
        success: VTT_COLORS.menuSuccess,
        danger: VTT_COLORS.menuDanger,
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: 0,
    },
    h2: {
      fontSize: '1.25rem',
      fontWeight: 700,
      letterSpacing: 0,
    },
    button: {
      textTransform: 'none',
      letterSpacing: 0,
      fontWeight: 700,
    },
  },
  components: {
    MuiModal: {
      defaultProps: { container: activePortalContainer },
    },
    MuiPopover: {
      defaultProps: { container: activePortalContainer },
    },
    MuiPopper: {
      defaultProps: { container: activePortalContainer },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 0,
        },
        scrollButtons: {
          width: 28,
          minHeight: 0,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 0,
          minWidth: 0,
          padding: '6px 10px',
          fontSize: '0.62rem',
          lineHeight: 1.2,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(215, 173, 82, 0.18)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          maxWidth: '100%',
          minWidth: 0,
          flexShrink: 1,
          fontWeight: 700,
          border: '1px solid transparent',
          // Clickable colored chips act as toggles: selected state gets a
          // solid fill so it stands apart from the tinted resting style.
          '&.MuiChip-clickable.MuiChip-colorPrimary': {
            backgroundColor: '#d7ad52',
            borderColor: '#d7ad52',
            color: '#17120d',
            '&:hover': { backgroundColor: '#e2bf70' },
          },
          '&.MuiChip-clickable.MuiChip-colorSecondary': {
            backgroundColor: '#70b7a6',
            borderColor: '#70b7a6',
            color: '#11201c',
            '&:hover': { backgroundColor: '#8ac8b9' },
          },
        },
        label: {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        },
        colorDefault: chipTintStyle('#f0e6d4', { bgAlpha: 0.10, borderAlpha: 0.32 }),
        colorPrimary: chipTintStyle('#d7ad52', { text: '#e8c87a' }),
        colorSecondary: chipTintStyle('#70b7a6', { text: '#96d8c6' }),
        colorError: chipTintStyle('#de675f', { text: '#f0958d' }),
        colorWarning: chipTintStyle('#d69245', { text: '#e9b275' }),
        colorSuccess: chipTintStyle('#58b879', { text: '#86d8a6' }),
      },
    },
    MuiStack: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },
  },
});
