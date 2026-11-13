import { Stack, Typography, useTheme } from '@mui/material';
import { Lock } from 'lucide-react';
import ResultBadge from '../../../shared/gmboard/ui/ResultBadge.jsx';
import { boardTone, complicationVisual } from '../../../shared/gmboard/ui/resultVisuals.js';
import { diceText, encounterDetail, lootDetail } from '../../../shared/gmboard/resultText.js';
import { trapLabel } from '../../../shared/dungeon/roomMarkers.js';
import { ResultCard, ResultLine, ResultSlot } from '../ui/ResultCard.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

function SlotBlock({ slot }) {
  const theme = useTheme();
  const visual = complicationVisual(slot.type);
  const tone = boardTone(theme.palette, 'result', visual.tone);
  const { extra } = slot;
  return (
    <ResultSlot
      tone={tone}
      icon={visual.icon}
      label={`Roll ${slot.n}/${slot.thr}`}
      badges={<ResultBadge tone={tone}>{slot.type}</ResultBadge>}
      dice={diceText(slot)}
    >
      {extra?.kind === 'enc' ? (
        <ResultLine>
          <ResultBadge tone={boardTone(theme.palette, 'difficulty', extra.data.diff)}>{extra.data.diff}</ResultBadge>{' '}
          {encounterDetail(extra.data)}
        </ResultLine>
      ) : null}
      {extra?.kind === 'trap' ? <ResultLine>{trapLabel(extra.data)}</ResultLine> : null}
      {extra?.kind === 'env' ? <ResultLine>Severity: {extra.data.severity}</ResultLine> : null}
    </ResultSlot>
  );
}

export default function RoomCard({ room }) {
  const theme = useTheme();
  const isSafe = room.slots.every((slot) => slot.type === 'None');
  const lootTone = boardTone(theme.palette, 'rarity', room.loot.data.rarity);
  const loot = lootDetail(room.loot.data);

  return (
    <ResultCard
      icon={GAME_ICONS.dungeon}
      title={`ROOM ${room.index}`}
      header={(
        <>
          <ResultBadge tone={theme.palette.text.secondary}>{room.popLabel} · {room.thr} {room.thr > 1 ? 'rolls' : 'roll'}</ResultBadge>
          {isSafe ? (
            <ResultBadge tone={theme.palette.gmboard.result.safe} icon={GAME_ICONS.safe}>Safe room</ResultBadge>
          ) : null}
        </>
      )}
    >
      {room.slots.map((slot) => <SlotBlock key={slot.n} slot={slot} />)}
      <ResultSlot
        tone={lootTone}
        icon={GAME_ICONS.loot}
        label="Loot"
        badges={<ResultBadge tone={lootTone}>{room.loot.data.type}</ResultBadge>}
        dice={diceText(room.loot)}
      >
        {loot ? <ResultLine>{loot}</ResultLine> : null}
        {room.lootDc ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.25 }}>
            <Lock size={ICON_SIZES.xxs} color={theme.palette.text.secondary} />
            <Typography sx={dcSx}>DC to find it: {room.lootDc.sum}</Typography>
          </Stack>
        ) : null}
      </ResultSlot>
    </ResultCard>
  );
}

const dcSx = {
  ...TEXT_STYLES.note, fontSize: FONT_SIZES.md,
  
};
