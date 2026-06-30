import { Avatar, Box, Button, Divider, IconButton, Stack, Typography } from '@mui/material';
import { ExternalLink, X } from 'lucide-react';
import CampaignSheetView from '../../campaignsheet/CampaignSheetView.jsx';
import { campaignSheetUrl } from '../logic/campaignSheetUrl.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';

export default function PlayerSheetPanel({ selection, onClose }) {
  const { state } = useEncounterBuilder();
  const combatant = state.combat?.combatants?.find((item) => item.id === selection?.combatantId);
  const sourceId = selection?.playerSourceId || combatant?.sourceId || null;

  if (!combatant) {
    return (
      <>
        <Box sx={playerHeaderSx}>
          <Typography variant="h2">Player Character</Typography>
          <IconButton onClick={onClose} sx={closeButtonSx} aria-label="Close character sheet">
            <X size={18} />
          </IconButton>
        </Box>
        <Divider />
        <Box sx={playerBodySx}>
          <Typography color="text.secondary">That combatant is no longer in the active encounter.</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <Box sx={playerHeaderSx}>
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', minWidth: 0, pr: 4, flexWrap: 'wrap' }}>
          <Avatar sx={(theme) => ({ ...avatarSx, bgcolor: combatant.color || theme.palette.pcToken })}>PC</Avatar>
          <Box sx={{ minWidth: 0, flex: '1 1 180px' }}>
            <Typography variant="h2" component="div" noWrap>{combatant.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Player character
            </Typography>
          </Box>
          {sourceId ? (
            <Button
              component="a"
              href={campaignSheetUrl(sourceId)}
              target="_blank"
              rel="noopener"
              size="small"
              variant="outlined"
              endIcon={<ExternalLink size={14} />}
              sx={{ flexShrink: 0 }}
            >
              Open sheet
            </Button>
          ) : null}
        </Stack>
        <IconButton onClick={onClose} sx={closeButtonSx} aria-label="Close character sheet">
          <X size={18} />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={playerBodySx}>
        <PlayerCombatSummary combatant={combatant} />
        {sourceId ? (
          <Box sx={sheetFrameSx}>
            <CampaignSheetView sheetId={sourceId} editable={false} embedded />
          </Box>
        ) : (
          <Box sx={fallbackSx}>
            <Typography variant="h2">Encounter Stats</Typography>
            <Typography color="text.secondary">
              No campaign sheet is linked to this player combatant.
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
}

function PlayerCombatSummary({ combatant }) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <SummaryItem label="AC" value={combatant.ac ?? '-'} />
      <SummaryItem label="HP" value={`${combatant.hpCurrent ?? 0} / ${combatant.hpMax ?? 0}`} />
      <SummaryItem label="Init" value={formatSigned(combatant.initMod)} />
      <SummaryItem label="Rolled" value={combatant.initiative ?? '-'} />
    </Stack>
  );
}

function SummaryItem({ label, value }) {
  return (
    <Box sx={summaryItemSx}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography fontWeight={800}>{value}</Typography>
    </Box>
  );
}

function formatSigned(value) {
  const number = Number(value) || 0;
  return number >= 0 ? `+${number}` : String(number);
}

const playerHeaderSx = {
  p: 2,
  position: 'relative',
};

const playerBodySx = {
  p: 2,
  overflow: 'auto',
  maxHeight: { xs: 520, xl: 'calc(100vh - 218px)' },
};

const avatarSx = {
  width: 58,
  height: 58,
  color: '#101010',
  fontSize: 14,
  fontWeight: 900,
  flex: '0 0 auto',
};

const closeButtonSx = {
  position: 'absolute',
  top: 8,
  right: 8,
};

const summaryItemSx = {
  px: 1.25,
  py: 0.75,
  minWidth: 84,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(255,255,255,0.025)',
};

const sheetFrameSx = {
  mt: 1.5,
  overflow: 'hidden',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'background.default',
};

const fallbackSx = {
  mt: 1.5,
  p: 2,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(255,255,255,0.025)',
};
