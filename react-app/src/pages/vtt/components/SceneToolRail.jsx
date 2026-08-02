import { useState } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { X } from 'lucide-react';

// A vertical rail of icons down the right edge of the map; clicking one opens
// its settings in a panel immediately to the left.
//
// The rail replaces a single drawer that held everything at once: one column of
// controls over a battlemap covered the board it was meant to adjust. Only one
// group is open at a time, and the panel is anchored rather than modal so the
// map stays visible and usable behind it.
export default function SceneToolRail({ groups }) {
  const [openId, setOpenId] = useState(null);
  const open = groups.find((group) => group.id === openId) || null;

  return (
    <>
      <Stack data-viewport-control spacing={0.5} sx={railSx}>
        {groups.map((group) => {
          const Icon = group.icon;
          const active = openId === group.id;
          return (
            <Box
              key={group.id}
              component="button"
              type="button"
              aria-pressed={active}
              onClick={() => setOpenId(active ? null : group.id)}
              sx={{ ...railButtonSx, ...(active ? railButtonActiveSx : null) }}
            >
              <Icon size={17} />
              <Typography component="span" sx={railLabelSx}>{group.label}</Typography>
            </Box>
          );
        })}
      </Stack>

      {/* A plain panel, not a Popover. A Popover lays an invisible backdrop over
          the map: its click closed the panel and the same click reopened it from
          the button underneath, so it never appeared to close at all. It also
          portals to the document root, which a fullscreen element hides. */}
      {open ? (
        <Box data-viewport-control sx={panelSx}>
          <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
            <Typography sx={panelTitleSx}>{open.label}</Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton size="small" aria-label="Close" onClick={() => setOpenId(null)} sx={{ color: '#b8a87a' }}>
              <X size={14} />
            </IconButton>
          </Stack>
          {open.content}
        </Box>
      ) : null}
    </>
  );
}

const railSx = {
  position: 'absolute',
  top: 48,
  right: 8,
  zIndex: 6,
  p: 0.5,
  borderRadius: 1,
  bgcolor: 'rgba(15,14,13,0.9)',
  border: '1px solid rgba(232,201,106,0.25)',
  maxHeight: 'calc(100% - 96px)',
  overflowY: 'auto',
};

const railButtonSx = {
  width: 62,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  px: 0.5,
  py: 0.75,
  border: 0,
  borderRadius: 1,
  background: 'none',
  color: '#b8a87a',
  cursor: 'pointer',
  '&:hover': { color: '#e8c96a', bgcolor: 'rgba(232,201,106,0.08)' },
};

const railButtonActiveSx = {
  color: '#0f0e0d',
  bgcolor: '#e8c96a',
  '&:hover': { color: '#0f0e0d', bgcolor: '#e8c96a' },
};

const railLabelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.55rem',
  letterSpacing: '0.04em',
  lineHeight: 1.1,
  textAlign: 'center',
};

// Immediately to the left of the rail, and scrollable rather than tall: a panel
// that runs past the bottom of the map would be unreachable in fullscreen.
const panelSx = {
  position: 'absolute',
  top: 48,
  right: 80,
  zIndex: 6,
  width: { xs: 260, sm: 330 },
  maxHeight: 'calc(100% - 104px)',
  overflowY: 'auto',
  p: 1.25,
  borderRadius: 1,
  bgcolor: 'rgba(15,14,13,0.97)',
  border: '1px solid rgba(232,201,106,0.3)',
  boxShadow: 6,
  cursor: 'default',
};

const panelTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  color: 'primary.main',
};
