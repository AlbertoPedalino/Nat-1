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
    <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ flex: 1, fontSize: FONT_SIZES.sm, color: 'text.secondary' }}>
        Read & study to permanently gain <Box component="b" sx={{ color: UI_COLORS.accentText }}>+{bonus.value} {ABILITY_ABBREVIATIONS[bonus.ability]}</Box>. The book then loses its magic.
      </Typography>
      <Button size="small" variant="outlined" onClick={onConsume}
        sx={{ ...TEXT_STYLES.title, fontSize: FONT_SIZES.xs, borderColor: UI_COLORS.accentText, color: UI_COLORS.accentText, '&:hover': { bgcolor: uiAlpha(UI_COLORS.accentText, OPACITY.soft), borderColor: UI_COLORS.accentText } }}>
        Read & Consume
      </Button>
    </Box>
  );
}

function AbilityChoicePanel({ item, onPick }) {
  const groups = getAbilityChoiceGroups(item);
  if (!groups.length) return null;
  const stored = (item.abilityChoice && typeof item.abilityChoice === 'object') ? item.abilityChoice : {};

  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: FONT_SIZES.xs, color: UI_COLORS.accentText, ...TEXT_STYLES.title, mb: 0.25 }}>
        Ability Choice
      </Typography>
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
              {from.map((abil) => {
                const isOn = current.includes(abil);
                return (
                  <Button key={abil} size="small" variant={isOn ? 'contained' : 'outlined'}
                    onClick={() => togglePick(abil)}
                    sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: FONT_SIZES.xs, ...TEXT_STYLES.figure,
                      ...(isOn ? { bgcolor: uiAlpha(UI_COLORS.accentText, OPACITY.fill), color: UI_COLORS.accentText, borderColor: UI_COLORS.accentText } : { color: 'text.secondary' }) }}>
                    {ABILITY_ABBREVIATIONS[abil] || abil.toUpperCase()}
                  </Button>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
