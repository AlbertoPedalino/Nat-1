import { Button, Stack, Typography } from '@mui/material';
import { BookOpen } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { goldToggleSx } from '../../../shared/ui/actionButton.js';
import {
  ALWAYS_ON_BOOKS,
  SELECTABLE_BOOKS,
  characterBooks,
  sourceLabel,
} from '../../../shared/content/sourcePriority.js';
import { picksFromUnusedBooks } from './bookPicks.js';

// The books the character is built from: the core ones always, the others as
// the player chooses. The steps and the sheet then offer only their content.
export default function BooksPanel({ character, dispatch }) {
  const chosen = characterBooks(character);
  const toggle = (book) => {
    const next = chosen.includes(book) ? chosen.filter((value) => value !== book) : [...chosen, book];
    dispatch({ type: 'field/set', field: 'books', value: SELECTABLE_BOOKS.filter((value) => next.includes(value)) });
  };
  const leftovers = picksFromUnusedBooks(character);
  return (
    <BuilderPanel
      id="panel-books"
      title="Books"
      icon={BookOpen}
      note="The builder and the sheet offer only the content of the books chosen here. The core books are always used."
    >
      <Stack direction="row" useFlexGap spacing={0.5} sx={{ flexWrap: 'wrap' }}>
        {ALWAYS_ON_BOOKS.map((book) => (
          <Button key={book} size="small" disabled aria-pressed sx={goldToggleSx(true)}>
            {sourceLabel(book)}
          </Button>
        ))}
        {SELECTABLE_BOOKS.map((book) => (
          <Button
            key={book}
            size="small"
            aria-pressed={chosen.includes(book)}
            onClick={() => toggle(book)}
            sx={goldToggleSx(chosen.includes(book))}
          >
            {sourceLabel(book)}
          </Button>
        ))}
      </Stack>
      {leftovers.length ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'warning.main' }}>
          From books not in use: {leftovers.join(', ')}. They stay on the character until you change them.
        </Typography>
      ) : null}
    </BuilderPanel>
  );
}
