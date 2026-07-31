import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemFilterPanel from './ItemFilterPanel.jsx';
import { emptyItemFilters } from './itemFilters.js';

const OPTIONS = {
  type: ['Simple Melee Weapon', 'Shield'],
  damage: ['1d4', '1d6'],
  damageType: ['piercing'],
  properties: ['Thrown', 'Light'],
  mastery: ['Nick'],
};

function renderPanel({ filters = emptyItemFilters(), options = OPTIONS, onChange = vi.fn() } = {}) {
  render(<ItemFilterPanel filters={filters} onChange={onChange} options={options} />);
  return onChange;
}

describe('ItemFilterPanel', () => {
  test('starts collapsed and opens on the toggle', async () => {
    renderPanel();
    expect(screen.queryByText('Damage Type')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /filters/i }));
    expect(screen.getByText('Damage Type')).toBeInTheDocument();
  });

  // Rows come from ITEM_FILTER_FIELDS, so a field added to the registry shows
  // up here without this component being touched.
  test('renders a row per field the pool has values for', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));

    ['Type', 'Damage', 'Damage Type', 'Properties', 'Mastery', 'Weight', 'Value']
      .forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  // A dropdown must never offer a value that matches nothing, so a field the
  // pool cannot answer is hidden entirely. Ranges always show.
  test('hides dropdown rows the pool has no values for', async () => {
    renderPanel({ options: { type: ['Shield'], damage: [], damageType: [], properties: [], mastery: [] } });
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.queryByText('Mastery')).not.toBeInTheDocument();
    expect(screen.queryByText('Damage Type')).not.toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
  });

  test('the badge counts active values, and Clear all appears only with some', async () => {
    renderPanel({ filters: { ...emptyItemFilters(), properties: ['Thrown', 'Light'], weightMin: '2' } });
    expect(screen.getByRole('button', { name: /filters \(3\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });

  test('no Clear all when nothing is filtered', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
  });

  test('Clear all hands back a fully empty filter set', async () => {
    const onChange = renderPanel({ filters: { ...emptyItemFilters(), type: 'Shield', weightMax: '5' } });

    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onChange).toHaveBeenCalledWith(emptyItemFilters());
  });

  test('typing a range bound reports only that key', async () => {
    const filters = emptyItemFilters();
    const onChange = renderPanel({ filters });
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));

    await userEvent.type(screen.getByLabelText('Weight minimum'), '2');
    expect(onChange).toHaveBeenCalledWith({ ...filters, weightMin: '2' });
  });
});
