import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import CampaignLinksMenu from '../../../../../src/pages/vtt/session/CampaignLinksMenu.jsx';

vi.mock('../../../../../src/app/navigation/LinkedToolsMenu.jsx', () => ({
  default: ({ sectionKey, instanceId, instanceSaved }) => (
    <button type="button">{`links:${sectionKey}:${instanceId}:${instanceSaved}`}</button>
  ),
}));

test('a battlemap opens its campaign links without looking up a GM Board', () => {
  render(<CampaignLinksMenu campaignId="campaign-1" />);
  expect(screen.getByText('links:campaign:campaign-1:true')).toBeEnabled();
});

test('no menu is shown without a campaign', () => {
  render(<CampaignLinksMenu />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
