import { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListSubheader,
  Typography,
} from '@mui/material';
import { ExternalLink } from 'lucide-react';
import { loadBookList } from './books.js';
import { UI_FONTS } from '../../shared/ui/fonts.js';
import LoadStatus, { isLoadPending } from '../../shared/ui/LoadStatus.jsx';

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

  if (isLoadPending(state.status)) {
    return (
      <LoadStatus
        status={state.status}
        loadingLabel="Loading the shelf…"
        errorMessage="The list of books could not be loaded. Check the connection and try again."
      />
    );
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

const scrollSx = { minHeight: 0, overflowY: 'auto', flex: 1 };

const subheaderSx = {
  bgcolor: 'background.paper',
  color: 'primary.main',
  fontFamily: UI_FONTS.display,
  letterSpacing: '0.06em',
  lineHeight: '36px',
};

const rowSx = { gap: 1, borderBottom: '1px solid', borderColor: 'divider' };

const idChipSx = { height: 20, fontSize: '0.65rem', flexShrink: 0 };
