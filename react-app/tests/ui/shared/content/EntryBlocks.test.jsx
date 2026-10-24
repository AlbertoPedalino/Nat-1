import { render, screen, within } from '@testing-library/react';
import { EntryBlocks } from '../../../../src/shared/content/EntryBlocks.jsx';
import { entriesToTextBlocks } from '../../../../src/shared/character/spells/spellEntries.js';

test('paragraphs, lists and tables render in order, lists grouped', () => {
  const { container } = render(<EntryBlocks entries={[
    'Before the list.',
    { type: 'list', items: ['First point.', 'Second point.'] },
    'After the list.',
    { type: 'table', colLabels: ['Roll', 'Result'], rows: [['1', 'Nothing']] },
  ]} />);
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['First point.', 'Second point.']);
  expect(container.querySelectorAll('ul')).toHaveLength(1);
  expect(screen.getByText('After the list.')).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Nothing' })).toBeInTheDocument();
});

test('a book draws its sidebars and read-aloud text as boxes; other readers never see the marks', () => {
  const entries = [
    { type: 'insetReadaloud', entries: ['The door creaks open.'] },
    { type: 'inset', name: 'Variant: Flanking', entries: ['A sidebar rule.', { type: 'list', items: ['One.'] }] },
    'After.',
  ];
  const { container } = render(<EntryBlocks blocks={entriesToTextBlocks(entries, { boxes: true })} />);
  const boxes = container.querySelectorAll('.MuiBox-root .MuiStack-root');
  expect(boxes.length).toBeGreaterThanOrEqual(2);
  expect(within(container).getByText('The door creaks open.')).toBeInTheDocument();
  expect(within(container).getByText('One.')).toBeInTheDocument();
  expect(entriesToTextBlocks(entries).some((block) => block.kind === 'boxStart')).toBe(false);
});
