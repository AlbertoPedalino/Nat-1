import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomItemDialog from '../../../../../src/pages/charsheet/inventory/CustomItemDialog.jsx';

describe('CustomItemDialog', () => {
  test('creates an item from the form, with its quantity', async () => {
    const onSave = vi.fn();
    render(<CustomItemDialog open onClose={() => {}} onSave={onSave} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Name'), 'Moonstone');
    await userEvent.type(screen.getByLabelText('Weight (lb)'), '0.5');
    await userEvent.type(screen.getByLabelText('Value'), '50');
    await userEvent.clear(screen.getByLabelText('Quantity'));
    await userEvent.type(screen.getByLabelText('Quantity'), '3');
    await userEvent.type(screen.getByPlaceholderText(/What it is/), 'Glows faintly.');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Moonstone', source: 'Custom', custom: true, type: 'G', rarity: 'none', weight: 0.5, value: 5000, entries: ['Glows faintly.'],
    }, 3);
  });

  test('edits an item: the form starts from it, no quantity', async () => {
    const onSave = vi.fn();
    const item = { name: 'Silk', custom: true, type: 'TG', rarity: 'none', weight: 1, value: 50, qty: 4 };
    render(<CustomItemDialog open item={item} onClose={() => {}} onSave={onSave} />);
    expect(screen.getByLabelText('Name')).toHaveValue('Silk');
    expect(screen.getByLabelText('Value')).toHaveValue('5');
    expect(screen.queryByLabelText('Quantity')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Name'), ' Bolt');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave.mock.calls[0][0]).toMatchObject({ name: 'Silk Bolt', type: 'TG', value: 50 });
  });
});
