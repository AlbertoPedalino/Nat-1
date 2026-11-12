import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import { ExternalLink } from 'lucide-react';
import PortraitBadge from '../../../shared/character/profile/PortraitBadge.jsx';
import CampaignSheetView from '../../campaignsheet/CampaignSheetView.jsx';
import { campaignSheetUrl } from '../../../shared/character/profile/characterRoutes.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES, FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import SidePanel from '../../../shared/ui/SidePanel.jsx';

const CLOSE_LABEL = 'Close character sheet';

// A player combatant's campaign sheet in the encounter's side panel, where a
// monster's stat block shows: the same SidePanel, so the two read alike. `sx`
// places the panel on the page.
export default function PlayerSheetPanel({ selection, onClose, sx }) {
  const { state, characterDigests } = useEncounterBuilder();
  const combatant = state.combat?.combatants?.find((item) => item.id === selection?.combatantId);
  const sourceId = selection?.playerSourceId || combatant?.sourceId || null;

  if (!combatant) {
    return (
      <SidePanel header={<Typography variant="h2">Player Character</Typography>} onClose={onClose} closeLabel={CLOSE_LABEL} sx={sx}>
        <EmptyLine>That combatant is no longer in the active encounter.</EmptyLine>
      </SidePanel>
    );
  }

  const header = (
    <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
      <PortraitBadge path={combatant.portraitPath} color={combatant.color} size={avatarSx.width}>
        <Avatar sx={{ ...avatarSx, bgcolor: 'transparent' }}>PC</Avatar>
      </PortraitBadge>
      <Box sx={{ minWidth: 0, flex: '1 1 180px' }}>
        <Typography variant="h2" component="div" noWrap>{combatant.name}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Player character
        </Typography>
      </Box>
      {sourceId ? (
        <Button
          component="a"
          href={campaignSheetUrl(sourceId, { edit: true })}
          target="_blank"
          rel="noopener"
          size="small"
          variant="outlined"
          endIcon={<ExternalLink size={ICON_SIZES.sm} />}
          sx={{ flexShrink: 0 }}
        >
          Open sheet
        </Button>
      ) : null}
    </Stack>
  );

  return (
    <SidePanel header={header} onClose={onClose} closeLabel={CLOSE_LABEL} sx={sx}>
      {sourceId ? (
        <Box sx={sheetFrameSx}>
          {/* Linked players are already followed for the encounter: the sheet
              takes its vitals from that digest instead of a channel of its own. */}
          <CampaignSheetView
            sheetId={sourceId}
            editable
            embedded
            liveDigest={characterDigests?.get(String(sourceId)) ?? null}
          />
        </Box>
      ) : (
        <Box sx={fallbackSx}>
          <Typography variant="h2">Encounter Stats</Typography>
          <Typography sx={{ color: 'text.secondary' }}>
            No campaign sheet is linked to this player combatant.
          </Typography>
        </Box>
      )}
    </SidePanel>
  );
}

const avatarSx = {
  width: 58,
  height: 58,
  color: UI_COLORS.surfaceSunken,
  fontSize: FONT_SIZES.xxl,
  fontWeight: FONT_WEIGHTS.heavy,
  flex: '0 0 auto',
};

const sheetFrameSx = {
  ...SURFACES.inset,
  mt: 1.5,
  overflow: 'hidden',
};

const fallbackSx = {
  ...SURFACES.wash,
  mt: 1.5,
  p: 2,
};
