import { useTheme } from '@mui/material';
import ResultBadge from '../../../shared/gmboard/ui/ResultBadge.jsx';
import { boardTone, eventVisual } from '../../../shared/gmboard/ui/resultVisuals.js';
import { diceText, encounterDetail, lootDetail } from '../../../shared/gmboard/resultText.js';
import { ResultCard, ResultLine, ResultSlot } from '../ui/ResultCard.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

export default function QuestCard({ quest }) {
  const theme = useTheme();
  const { icon: EventIcon, tone: eventToneKey } = eventVisual(quest.event);
  const eventTone = boardTone(theme.palette, 'result', eventToneKey);
  const encounterTone = theme.palette.gmboard.result.encounter;
  const rewardTone = boardTone(theme.palette, 'rarity', quest.reward.data.rarity);
  const reward = lootDetail(quest.reward.data);

  return (
    <ResultCard
      icon={GAME_ICONS.quest}
      title={`QUEST ${quest.index}`}
      header={<ResultBadge tone={eventTone} icon={EventIcon}>{quest.event.name}</ResultBadge>}
    >
      <ResultSlot tone={eventTone} icon={EventIcon} label="Event Hook" dice={diceText(quest.event)} />
      {quest.encounter ? (
        <ResultSlot
          tone={encounterTone}
          icon={GAME_ICONS.encounter}
          label="Encounter"
          badges={(
            <ResultBadge tone={boardTone(theme.palette, 'difficulty', quest.encounter.data.diff)}>
              {quest.encounter.data.diff}
            </ResultBadge>
          )}
          dice={diceText(quest.encounter)}
        >
          <ResultLine>{encounterDetail(quest.encounter.data)}</ResultLine>
        </ResultSlot>
      ) : null}
      <ResultSlot
        tone={rewardTone}
        icon={GAME_ICONS.loot}
        label="Reward"
        badges={(
          <>
            <ResultBadge tone={rewardTone}>{quest.reward.data.type}</ResultBadge>
            {quest.reward.isMinimum ? <ResultBadge tone={theme.palette.warning.main}>MINIMUM</ResultBadge> : null}
          </>
        )}
        dice={diceText(quest.reward)}
      >
        {reward ? <ResultLine>{reward}</ResultLine> : null}
      </ResultSlot>
    </ResultCard>
  );
}
