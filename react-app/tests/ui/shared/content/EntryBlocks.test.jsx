import { render, screen } from '@testing-library/react';
import { EntryBlocks } from '../../../../src/shared/content/EntryBlocks.jsx';

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
