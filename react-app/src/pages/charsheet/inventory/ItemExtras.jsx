import { Box, Button, Typography } from '@mui/material';
import {
  extractTomeBonus,
  getAbilityChoiceGroups,
  hasAbilityChoice,
  isConsumableTome,
} from '../../../shared/character/inventory/itemEffects.js';
import ScrollSpellPicker from './ScrollSpellPicker.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ABILITY_ABBREVIATIONS } from '../../../shared/content/rulesVocabulary.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import CardSection from '../../../shared/ui/CardSection.jsx';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';

// What an expanded inventory entry offers beyond its reference text, by kind of
// item: the spell written on a Spell Scroll, reading a manual or tome, and the
// ability an item with a choice raises. Each part renders only for its items.
export default function ItemExtras({ item, character = null, onWriteScroll, onConsumeTome, onPickAbility }) {
  return (
    <>
      <ScrollSpellPicker item={item} character={character} onWrite={onWriteScroll} />
      {isConsumableTome(item) ? <TomeConsumePanel item={item} onConsume={onConsumeTome} /> : null}
      {hasAbilityChoice(item) ? <AbilityChoicePanel item={item} onPick={onPickAbility} /> : null}
    </>
  );
}

function TomeConsumePanel({ item, onConsume }) {
  const bonus = extractTomeBonus(item);
  if (!bonus) return null;
  return (
    <CardSection sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ flex: 1, fontSize: FONT_SIZES.sm, color: 'text.secondary' }}>
        Read & study to permanently gain <Box component="b" sx={{ color: UI_COLORS.accentText }}>+{bonus.value} {ABILITY_ABBREVIATIONS[bonus.ability]}</Box>. The book then loses its magic.
      </Typography>
      <Button size="small" variant="outlined" onClick={onConsume}
        sx={{ ...TEXT_STYLES.title, fontSize: FONT_SIZES.xs, borderColor: UI_COLORS.accentText, color: UI_COLORS.accentText, '&:hover': { bgcolor: uiAlpha(UI_COLORS.accentText, OPACITY.soft), borderColor: UI_COLORS.accentText } }}>
        Read & Consume
      </Button>
    </CardSection>
  );
}

function AbilityChoicePanel({ item, onPick }) {
  const groups = getAbilityChoiceGroups(item);
  if (!groups.length) return null;
  const stored = (item.abilityChoice && typeof item.abilityChoice === 'object') ? item.abilityChoice : {};

  return (
    <CardSection title="Ability Choice">
      {groups.map((group, groupIdx) => {
        const from = Array.isArray(group.from) ? group.from : [];
        const count = Math.max(1, Number(group.count || 1));
        const amount = group.amount ?? 2;
        const current = Array.isArray(stored[groupIdx]) ? stored[groupIdx] : (stored[groupIdx] ? [stored[groupIdx]] : []);

        const togglePick = (abil) => {
          const exists = current.includes(abil);
          let next;
          if (exists) next = current.filter((a) => a !== abil);
          else next = count === 1 ? [abil] : [...current, abil].slice(-count);
          onPick(groupIdx, next);
        };

        return (
          <Box key={groupIdx} sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: FONT_SIZES.xxs, color: 'text.secondary', mb: 0.25 }}>
              Pick {count} (+{amount} each)
            </Typography>
            <ChoiceToggle
              multiple
              wrap
              size="xs"
              value={current}
              onChange={(_, abil) => togglePick(abil)}
              options={from.map((abil) => ({ value: abil, label: ABILITY_ABBREVIATIONS[abil] || abil.toUpperCase() }))}
            />
          </Box>
        );
      })}
    </CardSection>
  );
}
