import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import BuilderDataAlert from '../../../../../src/pages/charbuilder/layout/BuilderDataAlert.jsx';

test('nothing shows while every scope loaded', () => {
  const { container } = render(<BuilderDataAlert errors={{ classes: '', spells: '' }} onRetry={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});

test('failed scopes are named and retried together', () => {
  const onRetry = vi.fn();
  render(<BuilderDataAlert errors={{ classes: 'offline', spells: '', optionalFeatures: 'offline' }} onRetry={onRetry} />);
  expect(screen.getByText(/Could not load classes, optional features/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledWith(['classes', 'optionalFeatures']);
});
