import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { theme } from '../../../theme.js';
import CampaignLinksMenu from './CampaignLinksMenu.jsx';

const mocks = vi.hoisted(() => ({ readCampaignHexcrawlBoard: vi.fn() }));

vi.mock('../../../shared/cloud/hexcrawl.js', () => ({
  readCampaignHexcrawlBoard: mocks.readCampaignHexcrawlBoard,
}));

// The menu itself is covered by its own test; what matters here is which
// instance the map hands it.
vi.mock('../../../components/LinkedToolsMenu.jsx', () => ({
  default: ({ sectionKey, instanceId }) => (
    <button type="button">{`links:${sectionKey}:${instanceId}`}</button>
  ),
  LINKED_TOOLS_BUTTON_SX: {},
}));

const renderMenu = () => render(
  <ThemeProvider theme={theme}>
    <CampaignLinksMenu campaignId="campaign-1" />
  </ThemeProvider>,
);

test('the map opens the linked-tools menu of its campaign’s GM Board', async () => {
  mocks.readCampaignHexcrawlBoard.mockResolvedValue('board-a');
  renderMenu();
  expect(await screen.findByText('links:gmboard:board-a')).toBeInTheDocument();
});

test('a campaign with no board linked says so instead of offering a dead button', async () => {
  mocks.readCampaignHexcrawlBoard.mockResolvedValue(null);
  renderMenu();

  const button = screen.getByRole('button', { name: 'Linked tools' });
  expect(button).toBeDisabled();
  // The wrapper span is what carries the pointer events: a disabled button
  // fires none, so without it the reason never appears.
  fireEvent.mouseOver(button.closest('span'));
  expect(await screen.findByRole('tooltip')).toHaveTextContent('no GM Board linked');
});
