import { fireEvent, render, screen } from '@testing-library/react';
import GmRollsShownSwitch from '../../../../../src/shared/character/dice/GmRollsShownSwitch.jsx';
import { readGmRollsShown } from '../../../../../src/shared/cloud/sync/rollVisibility.js';

beforeEach(() => localStorage.clear());

test('says who sees creature and custom rolls, and two switches of a campaign stay in step', () => {
  render(<><GmRollsShownSwitch campaignId="c1" /><GmRollsShownSwitch campaignId="c1" /></>);
  expect(screen.getAllByText('Only the GM sees creature and custom rolls')).toHaveLength(2);
  fireEvent.click(screen.getAllByRole('switch')[0]);
  expect(screen.getAllByText('Players see creature and custom rolls')).toHaveLength(2);
  expect(readGmRollsShown('c1')).toBe(true);
  expect(readGmRollsShown('c2')).toBe(false);
});

test('without a campaign there is nobody to show rolls to', () => {
  render(<GmRollsShownSwitch campaignId={null} />);
  expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  expect(screen.getByText('No campaign: rolls stay on this screen.')).toBeInTheDocument();
});
