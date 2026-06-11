import { createTheme } from '@mui/material';
import { chipTintStyle } from './shared/entityColors.js';

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
