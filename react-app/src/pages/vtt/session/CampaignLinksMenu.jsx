import LinkedToolsMenu from '../../../app/navigation/LinkedToolsMenu.jsx';

// A campaign is a group member in its own right, including without a GM Board.
export default function CampaignLinksMenu({ campaignId }) {
  if (!campaignId) return null;
  return <LinkedToolsMenu sectionKey="campaign" instanceId={campaignId} instanceSaved />;
}
