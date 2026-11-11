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
import { captionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { rowChipSx } from '../compendiumStyles.js';
import LoadStatus, { isLoadPending } from '../../../shared/ui/LoadStatus.jsx';
import { useLoaded } from '../../../shared/ui/useLoaded.js';
import { FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { LIST_ROW_RULE_SX } from '../../../shared/ui/interactive.js';

const NO_BOOKS = [];

// The supported manuals and adventures, each opening its 5etools page in a new
// tab.
export default function BookLinks() {
  const { status, data: books } = useLoaded(loadBookList, [], { initial: NO_BOOKS });
  const state = { status, books };

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
              <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHTS.bold, flex: 1 }}>{book.name}</Typography>
              <Chip size="small" variant="outlined" label={book.id} sx={rowChipSx} />
              <ExternalLink size={ICON_SIZES.sm} />
            </ListItemButton>
          ))}
        </List>
      ))}
    </Box>
  );
}

const scrollSx = { minHeight: 0, overflowY: 'auto', flex: 1 };

const subheaderSx = {
  ...captionLabelSx,
  bgcolor: 'background.paper',
  color: 'primary.main',
  lineHeight: '36px',
};

const rowSx = { gap: 1, ...LIST_ROW_RULE_SX };
