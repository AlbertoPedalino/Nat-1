import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { BookOpen } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { goldToggleSx } from '../../../shared/ui/actionButton.js';
import {
  ALWAYS_ON_BOOKS,
  SELECTABLE_BOOKS,
  UNIVERSES_BEYOND_BOOKS,
  characterBooks,
  sourceLabel,
} from '../../../shared/content/sourcePriority.js';
import { picksFromUnusedBooks } from './bookPicks.js';
import { BUILDER_TEXT } from '../layout/builderText.js';

// The books the character is built from: the core ones always, the others as
// the player chooses. The steps and the sheet then offer only their content.
// Dungeons & Dragons books and Universes Beyond ones (another franchise's
// world, which changes the story) are shown apart.
export default function BooksPanel({ character, dispatch }) {
  const chosen = characterBooks(character);
  const toggle = (book) => {
    const next = chosen.includes(book) ? chosen.filter((value) => value !== book) : [...chosen, book];
    dispatch({ type: 'field/set', field: 'books', value: SELECTABLE_BOOKS.filter((value) => next.includes(value)) });
  };
  const bookButton = (book) => (
    <Button
      key={book}
      size="small"
      aria-pressed={chosen.includes(book)}
      onClick={() => toggle(book)}
      sx={goldToggleSx(chosen.includes(book))}
    >
      {sourceLabel(book)}
    </Button>
  );
  const leftovers = picksFromUnusedBooks(character);
  return (
    <BuilderPanel
      id="panel-books"
      title="Books"
      icon={BookOpen}
      note="The builder and the sheet offer only the content of the books chosen here. The core books are always used."
    >
      <BookGroup title="Dungeons & Dragons">
        {ALWAYS_ON_BOOKS.map((book) => (
          <Button key={book} size="small" disabled aria-pressed sx={goldToggleSx(true)}>
            {sourceLabel(book)}
          </Button>
        ))}
        {SELECTABLE_BOOKS.filter((book) => !UNIVERSES_BEYOND_BOOKS.includes(book)).map(bookButton)}
      </BookGroup>
      <Divider sx={{ my: 1 }} />
      <BookGroup
        title="Universes Beyond"
        note="Books set in another franchise's world: they change the setting and the story, not only the options."
      >
        {UNIVERSES_BEYOND_BOOKS.map(bookButton)}
      </BookGroup>
      {leftovers.length ? (
        <Typography sx={{ ...BUILDER_TEXT.hint, mt: 0.75, color: 'warning.main' }}>
          From books not in use: {leftovers.join(', ')}. They stay on the character until you change them.
        </Typography>
      ) : null}
    </BuilderPanel>
  );
}

function BookGroup({ title, note, children }) {
  return (
    <Box>
      <Typography sx={{ ...BUILDER_TEXT.groupLabel, mb: 0.5 }}>{title}</Typography>
      {note ? (
        <Typography sx={{ ...BUILDER_TEXT.hint, mb: 0.5 }}>{note}</Typography>
      ) : null}
      <Stack direction="row" useFlexGap spacing={0.5} sx={{ flexWrap: 'wrap' }}>
        {children}
      </Stack>
    </Box>
  );
}
