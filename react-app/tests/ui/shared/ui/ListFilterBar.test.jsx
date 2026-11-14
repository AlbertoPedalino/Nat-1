import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import ListFilterBar from '../../../../src/shared/ui/ListFilterBar.jsx';
import { useListFilter } from '../../../../src/shared/ui/useListFilter.js';
import { campaignFilterField } from '../../../../src/shared/campaign/toolCampaigns.js';

const rows = [
  { id: 'a', name: 'Goblin cave', campaigns: ['c1'] },
  { id: 'b', name: 'Dragon lair', campaigns: ['c2'] },
  { id: 'c', name: 'Goblin market', campaigns: [] },
];
const CAMPAIGNS = [{ id: 'c1', name: 'Tavern' }, { id: 'c2', name: 'Crypt' }];
const getText = (row) => row.name;
const campaignIdsOf = (row) => row.campaigns;

function List({ campaigns = CAMPAIGNS }) {
  const filter = useListFilter(rows, { getText, fields: [campaignFilterField(campaigns, campaignIdsOf)] });
  return (
    <>
      <ListFilterBar filter={filter} what="saves" />
      <ul>{filter.visible.map((row) => <li key={row.id}>{row.name}</li>)}</ul>
    </>
  );
}

const shown = () => within(screen.getByRole('list')).queryAllByRole('listitem').map((item) => item.textContent);
const search = () => screen.getByRole('searchbox', { name: 'Search saves' });
// The campaign filter takes several campaigns at once: each pick toggles one.
const pickCampaign = (name) => {
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', { name }));
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
};

test('the search narrows the list by every word', () => {
  render(<List />);
  fireEvent.change(search(), { target: { value: 'gob mark' } });
  expect(shown()).toEqual(['Goblin market']);
});

test('the campaign filter keeps the chosen campaigns, and the rows in none', () => {
  render(<List />);
  pickCampaign('Crypt');
  expect(shown()).toEqual(['Dragon lair']);
  pickCampaign('No campaign');
  expect(shown()).toEqual(['Dragon lair', 'Goblin market']);
});

test('with no campaign to offer there is no campaign filter', () => {
  render(<List campaigns={[]} />);
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(shown()).toHaveLength(3);
});

test('a chosen campaign that is no longer offered stops filtering', () => {
  const { rerender } = render(<List />);
  pickCampaign('Crypt');
  expect(shown()).toEqual(['Dragon lair']);
  rerender(<List campaigns={[]} />);
  expect(shown()).toHaveLength(3);
});

test('a search that leaves nothing says so', () => {
  render(<List />);
  fireEvent.change(search(), { target: { value: 'owlbear' } });
  expect(shown()).toEqual([]);
  expect(screen.getByText('No saves match.')).toBeInTheDocument();
});
