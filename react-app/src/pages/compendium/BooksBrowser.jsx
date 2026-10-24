import {
  useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, IconButton, List, ListItemButton, ListSubheader, Stack, Typography,
} from '@mui/material';
import { ArrowLeft, ChevronLeft, ChevronRight, ListTree, X } from 'lucide-react';
import SearchField from '../../shared/ui/SearchField.jsx';
import { EntryBlocks } from '../../shared/content/EntryBlocks.jsx';
import { RefLinkContext } from '../../shared/content/RichText.jsx';
import { fullscreenContainer } from '../vtt/map/fullscreenContainer.js';
import { COMPENDIUM_TAGS, loadBook, loadBookList, searchBook } from './books.js';
import { createCompendiumLookup } from './compendiumIndex.js';
import CompendiumDetail from './CompendiumDetail.jsx';

// Chapters parsed once per tab and book: reopening a book, or the same book
// in the page and the panel, does not walk it again. Keyed with whether its
// references were resolved, so a book opened while the compendium was
// unavailable is resolved properly once it is.
const chapterCache = new Map();

function useBookList() {
  const [state, setState] = useState({ status: 'loading', books: [] });
  useEffect(() => {
    let cancelled = false;
    loadBookList()
      .then((books) => { if (!cancelled) setState({ status: 'ready', books }); })
      .catch(() => { if (!cancelled) setState({ status: 'error', books: [] }); });
    return () => { cancelled = true; };
  }, []);
  return state;
}

// The book's references are resolved from the compendium, so it opens once
// the compendium has loaded (or failed to).
function useBook(meta, compendium) {
  const [state, setState] = useState({ status: 'idle', chapters: [] });
  const waiting = compendium.status === 'loading';
  const lookup = useMemo(
    () => (compendium.index.length ? createCompendiumLookup(compendium.index) : null),
    [compendium.index],
  );
  useEffect(() => {
    if (!meta || waiting) { setState({ status: 'idle', chapters: [] }); return undefined; }
    const key = `${meta.id}:${lookup ? 'resolved' : 'plain'}`;
    const cached = chapterCache.get(key);
    if (cached) { setState({ status: 'ready', chapters: cached }); return undefined; }
    let cancelled = false;
    setState({ status: 'loading', chapters: [] });
    loadBook(meta, { lookup })
      .then((chapters) => {
        chapterCache.set(key, chapters);
        if (!cancelled) setState({ status: 'ready', chapters });
      })
      .catch(() => { if (!cancelled) setState({ status: 'error', chapters: [] }); });
    return () => { cancelled = true; };
  }, [lookup, meta, waiting]);
  return { ...state, lookup };
}

// The supported manuals and adventures: pick one, read it by chapter, search
// inside it. `layout` as in CompendiumBrowser: 'page' puts the contents (or
// the search hits) beside the text; 'panel' shows one at a time. `compendium`
// is useCompendium()'s state: what the books' references are resolved from.
export default function BooksBrowser({ layout = 'page', compendium }) {
  const list = useBookList();
  const [book, setBook] = useState(null);

  if (book) {
    return <BookReader key={book.id} book={book} layout={layout} compendium={compendium} onBack={() => setBook(null)} />;
  }

  if (list.status === 'loading') {
    return (
      <Stack direction="row" spacing={1} sx={statusSx}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading the shelf…</Typography>
      </Stack>
    );
  }
  if (list.status === 'error') {
    return <Alert severity="error" sx={{ m: 1 }}>The list of books could not be loaded. Check the connection and try again.</Alert>;
  }
  const groups = [
    ['Manuals', list.books.filter((entry) => entry.kind === 'book')],
    ['Adventures', list.books.filter((entry) => entry.kind === 'adventure')],
  ].filter(([, books]) => books.length);
  return (
    <Box sx={scrollSx}>
      {groups.map(([title, books]) => (
        <List key={title} dense subheader={<ListSubheader sx={subheaderSx}>{title}</ListSubheader>} aria-label={title}>
          {books.map((entry) => (
            <ListItemButton key={entry.id} onClick={() => setBook(entry)} sx={rowSx}>
              <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>{entry.name}</Typography>
              <Chip size="small" variant="outlined" label={entry.id} sx={idChipSx} />
            </ListItemButton>
          ))}
        </List>
      ))}
    </Box>
  );
}

function BookReader({ book, layout, compendium, onBack }) {
  const loaded = useBook(book, compendium);
  const chapters = loaded.chapters;
  // A spell, item, creature… the text names opens over the page, which keeps
  // its place underneath.
  const [opened, setOpened] = useState(null);
  const refLinks = useMemo(() => (loaded.lookup ? {
    resolve: (token) => {
      const kind = COMPENDIUM_TAGS[token.refType];
      return kind ? loaded.lookup(kind, token.target, token.source) : null;
    },
    open: setOpened,
  } : null), [loaded.lookup]);
  const [position, setPosition] = useState({ chapterIndex: 0, sectionIndex: 0, blockIndex: null, at: 0 });
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const hits = useMemo(() => searchBook(chapters, deferredQuery), [chapters, deferredQuery]);
  const searching = deferredQuery.trim().length >= 2;
  const panel = layout === 'panel';
  const [reading, setReading] = useState(false);
  const textRef = useRef(null);
  const chapter = chapters[position.chapterIndex] || null;

  // Land on the section (or the found block) asked for, within the text's own
  // scroll box: scrolling the page around it would move the map or the sheet.
  useLayoutEffect(() => {
    const box = textRef.current;
    if (!box || !chapter) return;
    // A chapter opens at its title, which sits above its first section.
    if (position.blockIndex == null && position.sectionIndex === 0) { box.scrollTop = 0; return; }
    const anchor = position.blockIndex != null
      ? box.querySelector('[data-book-hit]')
      : box.querySelector(`[data-book-section="${position.sectionIndex}"]`);
    if (!anchor) { box.scrollTop = 0; return; }
    box.scrollTop += anchor.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
  }, [chapter, position]);

  // Beside the contents on a wide page; in their place on a phone or a panel.
  const go = (next) => {
    setPosition({ blockIndex: null, ...next, at: Date.now() });
    setReading(true);
  };

  const header = (
    <Box sx={readerHeaderSx}>
      <Button size="small" startIcon={<ArrowLeft size={14} />} onClick={onBack}>Books</Button>
      <Typography variant="body2" sx={bookTitleSx}>{book.name}</Typography>
    </Box>
  );

  if (loaded.status === 'loading' || loaded.status === 'idle') {
    return (
      <Box sx={columnSx}>
        {header}
        <Stack direction="row" spacing={1} sx={statusSx}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Opening the book…</Typography>
        </Stack>
      </Box>
    );
  }
  if (loaded.status === 'error') {
    return (
      <Box sx={columnSx}>
        {header}
        <Alert severity="error" sx={{ m: 1 }}>This book could not be loaded.</Alert>
      </Box>
    );
  }

  const navigator = (
    <Box sx={columnSx}>
      <Box sx={searchBoxSx}>
        <SearchField value={query} onChange={setQuery} placeholder={`Search ${book.name}…`} ariaLabel="Search this book" />
      </Box>
      <Box sx={scrollSx}>
        {searching ? (
          hits.length ? (
            <List dense disablePadding aria-label="Found in the book">
              {hits.map((hit) => (
                <ListItemButton
                  key={hit.key}
                  onClick={() => go({ chapterIndex: hit.chapterIndex, sectionIndex: hit.sectionIndex, blockIndex: hit.blockIndex })}
                  sx={hitSx}
                >
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>
                    {hit.chapter}{hit.section !== hit.chapter ? ` › ${hit.section}` : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>{hit.snippet}</Typography>
                </ListItemButton>
              ))}
              {hits.length === 200 ? (
                <Typography variant="caption" color="text.secondary" sx={statusSx}>The first 200 places: add a word to narrow it down.</Typography>
              ) : null}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={statusSx}>Not found in this book.</Typography>
          )
        ) : (
          <List dense disablePadding aria-label="Contents">
            {chapters.map((entry) => {
              const open = entry.index === position.chapterIndex;
              return (
                <Box key={entry.index}>
                  <ListItemButton
                    selected={open && position.sectionIndex === 0 && position.blockIndex == null}
                    onClick={() => go({ chapterIndex: entry.index, sectionIndex: 0 })}
                    sx={chapterRowSx}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{entry.name}</Typography>
                  </ListItemButton>
                  {open ? entry.sections.slice(entry.sections[0]?.name === entry.name ? 1 : 0).map((section) => (
                    <ListItemButton
                      key={section.index}
                      selected={position.sectionIndex === section.index && position.blockIndex == null}
                      onClick={() => go({ chapterIndex: entry.index, sectionIndex: section.index })}
                      sx={sectionRowSx}
                    >
                      <Typography variant="body2" color="text.secondary">{section.name}</Typography>
                    </ListItemButton>
                  )) : null}
                </Box>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );

  const text = chapter ? (
    <Box ref={textRef} sx={[scrollSx, textSx]}>
      {panel ? (
        <Button size="small" startIcon={<ListTree size={14} />} onClick={() => setReading(false)} sx={{ mb: 1 }}>
          {searching ? 'Back to results' : 'Contents'}
        </Button>
      ) : null}
      <Typography variant="h2" component="h2" sx={chapterTitleSx}>{chapter.name}</Typography>
      {chapter.sections.map((section) => (
        <Box key={section.index} data-book-section={section.index} sx={{ mb: 1.5 }}>
          <SectionText
            section={section}
            hitIndex={position.sectionIndex === section.index ? position.blockIndex : null}
            hitKey={position.at}
          />
        </Box>
      ))}
      <Stack direction="row" spacing={1} sx={chapterNavSx}>
        <Button
          size="small"
          startIcon={<ChevronLeft size={14} />}
          disabled={position.chapterIndex === 0}
          onClick={() => go({ chapterIndex: position.chapterIndex - 1, sectionIndex: 0 })}
        >
          Previous
        </Button>
        <Button
          size="small"
          endIcon={<ChevronRight size={14} />}
          disabled={position.chapterIndex >= chapters.length - 1}
          onClick={() => go({ chapterIndex: position.chapterIndex + 1, sectionIndex: 0 })}
        >
          Next
        </Button>
      </Stack>
    </Box>
  ) : null;

  const entryDialog = (
    <Dialog open={Boolean(opened)} onClose={() => setOpened(null)} maxWidth="sm" fullWidth container={fullscreenContainer}>
      <DialogContent sx={{ position: 'relative', pt: 3 }}>
        <IconButton size="small" aria-label="Close" onClick={() => setOpened(null)} sx={dialogCloseSx}>
          <X size={16} />
        </IconButton>
        {opened ? <CompendiumDetail key={opened.key} entry={opened} legendaryGroups={compendium.legendaryGroups} /> : null}
      </DialogContent>
    </Dialog>
  );

  if (panel) {
    return (
      <RefLinkContext.Provider value={refLinks}>
        <Box sx={columnSx}>
          {header}
          {reading ? text : navigator}
        </Box>
        {entryDialog}
      </RefLinkContext.Provider>
    );
  }
  return (
    <RefLinkContext.Provider value={refLinks}>
      <Box sx={columnSx}>
        {header}
        <Box sx={readerBodySx}>
          <Box sx={[navigatorColumnSx, reading && { display: { xs: 'none', md: 'flex' } }]}>{navigator}</Box>
          <Box sx={[textColumnSx, !reading && { display: { xs: 'none', md: 'flex' } }]}>
            <Button
              size="small"
              startIcon={<ListTree size={14} />}
              onClick={() => setReading(false)}
              sx={{ display: { md: 'none' }, alignSelf: 'flex-start', m: 1, mb: 0 }}
            >
              {searching ? 'Back to results' : 'Contents'}
            </Button>
            {text}
          </Box>
        </Box>
      </Box>
      {entryDialog}
    </RefLinkContext.Provider>
  );
}

// A section's text; the block a search landed on is set apart and marked so
// the reader can be brought to it.
function SectionText({ section, hitIndex, hitKey }) {
  if (hitIndex == null) return <EntryBlocks blocks={section.blocks} emptyText="" />;
  const before = section.blocks.slice(0, hitIndex);
  const hit = section.blocks.slice(hitIndex, hitIndex + 1);
  const after = section.blocks.slice(hitIndex + 1);
  return (
    <Stack spacing={0.65}>
      {before.length ? <EntryBlocks blocks={before} emptyText="" /> : null}
      <Box key={hitKey} data-book-hit sx={hitBlockSx}><EntryBlocks blocks={hit} emptyText="" /></Box>
      {after.length ? <EntryBlocks blocks={after} emptyText="" /> : null}
    </Stack>
  );
}

const statusSx = { p: 2, alignItems: 'center' };

const dialogCloseSx = { position: 'absolute', top: 8, right: 8, zIndex: 1 };

const scrollSx = { minHeight: 0, overflowY: 'auto', flex: 1 };

const columnSx = { display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' };

const subheaderSx = {
  bgcolor: 'background.paper',
  color: 'primary.main',
  fontFamily: '"Cinzel", Georgia, serif',
  letterSpacing: '0.06em',
  lineHeight: '36px',
};

const rowSx = { gap: 1, borderBottom: '1px solid', borderColor: 'divider' };

const idChipSx = { height: 20, fontSize: '0.65rem', flexShrink: 0 };

const readerHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1,
  py: 0.75,
  borderBottom: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
  minWidth: 0,
};

const bookTitleSx = {
  fontWeight: 700,
  color: 'primary.main',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const searchBoxSx = { p: 1, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 };

const hitSx = {
  display: 'block',
  borderBottom: '1px solid',
  borderColor: 'divider',
};

const chapterRowSx = { borderBottom: '1px solid', borderColor: 'divider' };

const sectionRowSx = { pl: 3, py: 0.25 };

const textSx = { p: 2 };

const chapterTitleSx = { fontSize: '1.2rem', mb: 1.5 };

const chapterNavSx = { justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'divider' };

const hitBlockSx = {
  borderLeft: '3px solid',
  borderColor: 'primary.main',
  pl: 1,
  bgcolor: 'action.selected',
  borderRadius: 0.5,
};

const readerBodySx = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 340px) 1fr' },
};

const navigatorColumnSx = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  borderRight: { md: '1px solid' },
  borderColor: { md: 'divider' },
};

const textColumnSx = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
};
