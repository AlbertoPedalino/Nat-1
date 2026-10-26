import { useEffect, useState } from 'react';
import {
  Alert, Box, Chip, CircularProgress, List, ListItemButton, ListSubheader, Stack, Typography,
} from '@mui/material';
import { ExternalLink } from 'lucide-react';
import { loadBookList } from './books.js';

// The supported manuals and adventures, each opening its 5etools page in a new
// tab.
export default function BookLinks() {
  const [state, setState] = useState({ status: 'loading', books: [] });
  useEffect(() => {
    let cancelled = false;
    loadBookList()
      .then((books) => { if (!cancelled) setState({ status: 'ready', books }); })
      .catch(() => { if (!cancelled) setState({ status: 'error', books: [] }); });
    return () => { cancelled = true; };
  }, []);

  if (state.status === 'loading') {
    return (
      <Stack direction="row" spacing={1} sx={statusSx}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading the shelf…</Typography>
      </Stack>
    );
  }
  if (state.status === 'error') {
    return <Alert severity="error" sx={{ m: 1 }}>The list of books could not be loaded. Check the connection and try again.</Alert>;
  }
  const groups = [
    ['Manuals', state.books.filter((book) => book.kind === 'book')],
    ['Adventures', state.books.filter((book) => book.kind === 'adventure')],
  ].filter(([, books]) => books.length);
  return (
    <Box sx={scrollSx}>
      {groups.map(([title, books]) => (
        <List key={title} dense subheader={<ListSubheader sx={subheaderSx}>{title}</ListSubheader>} aria-label={title}>
          {books.map((book) => (
            <ListItemButton key={book.id} component="a" href={book.url} target="_blank" rel="noopener" sx={rowSx}>
              <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>{book.name}</Typography>
              <Chip size="small" variant="outlined" label={book.id} sx={idChipSx} />
              <ExternalLink size={14} />
            </ListItemButton>
          ))}
        </List>
      ))}
    </Box>
  );
}

const statusSx = { p: 2, alignItems: 'center' };

const scrollSx = { minHeight: 0, overflowY: 'auto', flex: 1 };

const subheaderSx = {
  bgcolor: 'background.paper',
  color: 'primary.main',
  fontFamily: '"Cinzel", Georgia, serif',
  letterSpacing: '0.06em',
  lineHeight: '36px',
};

const rowSx = { gap: 1, borderBottom: '1px solid', borderColor: 'divider' };

const idChipSx = { height: 20, fontSize: '0.65rem', flexShrink: 0 };
