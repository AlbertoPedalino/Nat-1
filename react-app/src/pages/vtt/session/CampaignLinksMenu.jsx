import { useEffect, useState } from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { Network } from 'lucide-react';
import LinkedToolsMenu, { LINKED_TOOLS_BUTTON_SX } from '../../../app/navigation/LinkedToolsMenu.jsx';
import { readCampaignHexcrawlBoard } from '../../../shared/cloud/api/hexcrawl.js';

// The map's LINKS button.
//
// A battle map is not a tool instance — it is a scene of a campaign — so it has
// no link group of its own. The chain it does have is the one the dungeon panel
// already walks: the campaign names the GM Board that keeps its tables, and that
// board sits in a group with the Encounter Builder and the DM Screen of the same
// table. So this opens the board's own linked-tools menu, which is where the
// Encounter Builder a room's fight is sent to gets chosen in the first place.
//
// GM only, and only with a campaign open: a player has no tools to link.
export default function CampaignLinksMenu({ campaignId }) {
  const [boardId, setBoardId] = useState(null);
  const [checking, setChecking] = useState(Boolean(campaignId));

  useEffect(() => {
    let cancelled = false;
    if (!campaignId) {
      setBoardId(null);
      setChecking(false);
      return () => { cancelled = true; };
    }
    setChecking(true);
    setBoardId(null);
    let request = 0;
    const refresh = async () => {
      const ticket = ++request;
      try {
        const id = await readCampaignHexcrawlBoard(campaignId);
        if (!cancelled && ticket === request) setBoardId(id || null);
      } catch {
        if (!cancelled && ticket === request) setBoardId(null);
      } finally {
        if (!cancelled && ticket === request) setChecking(false);
      }
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    window.addEventListener('gb:campaign-board-link-changed', refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('gb:campaign-board-link-changed', refresh);
    };
  }, [campaignId]);

  // The board is already saved by definition — the campaign row points at it —
  // so there is no draft check to make here.
  if (boardId) {
    return (
      <LinkedToolsMenu
        sectionKey="gmboard"
        instanceId={boardId}
        instanceSaved
        showCurrentLink
      />
    );
  }

  // Nothing to link to yet, said as the thing to go and do rather than as a
  // button that does nothing when pressed.
  return (
    <Tooltip title={checking
      ? 'Looking for this campaign’s GM Board…'
      : 'This campaign has no GM Board linked. Open Links on the GM Board and choose this campaign.'}
    >
      <span style={{ display: 'inline-flex' }}>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          startIcon={<Network size={14} />}
          disabled
          aria-label="Linked tools"
          sx={LINKED_TOOLS_BUTTON_SX}
        >
          <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>LINKS</Box>
        </Button>
      </span>
    </Tooltip>
  );
}
