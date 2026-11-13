import { useEffect } from 'react';
import { Stack } from '@mui/material';
import ScrollWell from '../../../shared/ui/ScrollWell.jsx';
import { fixedSubclassShortName } from '../../../shared/content/catalogs/classScope.js';
import { isBookAllowed } from '../../../shared/content/sourcePriority.js';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { EntryAccordion } from '../../../shared/content/EntryAccordion.jsx';
import { ENTITY_COLORS } from '../../../shared/ui/entityColors.js';
import { activeClassCharacter, activeExtraClass } from '../state/activeClass.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import SelectField from '../../../shared/ui/SelectField.jsx';

function SubclassFeatureRow({ feature }) {
  return (
    <EntryAccordion
      title={feature.name}
      entries={feature.entries}
      tone={ENTITY_COLORS.subclass}
      leading={<MiniBadge label={`Lv ${feature.level}`} color={UI_COLORS.textSecondary} />}
    />
  );
}

export default function SubclassPanel({ character, dispatch }) {
  const tab = character.activeClassTab || 0;
  const isExtra = tab > 0;
  const extraIdx = tab - 1;
  const extra = activeExtraClass(character);
  const { cls, subclasses: allSubclasses = [], allSubFeatures = [] } = activeClassCharacter(character);
  const subclassShortName = isExtra ? (extra?.subclassShortName || '') : (character.subclassShortName || '');
  // Only the subclasses of the books the character uses (the current one kept).
  const subclasses = allSubclasses.filter((sub) => isBookAllowed(character, sub.source) || sub.shortName === subclassShortName);
  const unlockLevel = cls?.subclassLevel || 3;
  const currentLevel = isExtra ? (extra?.level || 1) : primaryClassLevel(character);
  // A hero class whose subclass is fixed (Death Knight, Demon Hunter) takes it
  // as soon as it unlocks.
  const fixed = fixedSubclassShortName(cls, subclasses);
  const unlocked = currentLevel >= unlockLevel;
  useEffect(() => {
    if (!fixed || !unlocked || subclassShortName === fixed) return;
    if (isExtra) dispatch({ type: 'extra-subclass/select', index: extraIdx, subclassShortName: fixed });
    else dispatch({ type: 'subclass/select', subclassShortName: fixed });
  }, [fixed, unlocked, subclassShortName, isExtra, extraIdx, dispatch]);
  if (!cls || !subclasses.length || !unlocked) return null;
  const title = cls.subclassTitle || 'Subclass';
  const subclassFeatures = allSubFeatures.filter(
    (feature) => feature.subclassShortName === subclassShortName
      && !feature?.isReprinted
      && Number(feature?.level || 0) <= currentLevel,
  );
  const onChange = (value) => {
    if (isExtra) dispatch({ type: 'extra-subclass/select', index: extraIdx, subclassShortName: value });
    else dispatch({ type: 'subclass/select', subclassShortName: value });
  };
  return (
    <BuilderPanel id="panel-subclass" tone={ENTITY_COLORS.subclass} title={isExtra ? `${title} — ${extra?.name || ''}` : title} icon={GAME_ICONS.subclass} note={`Unlock level ${unlockLevel}`}>
      <Stack spacing={1.5}>
        <SelectField
          label={title}
          value={subclassShortName}
          disabled={Boolean(fixed)}
          onChange={onChange}
          emptyOption={{ label: 'None' }}
          options={subclasses.map((subclass) => ({
            value: subclass.shortName || subclass.name,
            label: `${subclass.name || subclass.shortName} (${subclass.source})`,
          }))}
          helperText={fixed ? 'The subclass of this hero class is fixed.' : null}
        />
        {subclassShortName ? (
          <ScrollWell maxHeight={450} sx={{ p: 0.5, overflowX: 'hidden', minWidth: 0 }}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              {subclassFeatures.map((feature) => (
                <SubclassFeatureRow key={`${feature.name}-${feature.level}`} feature={feature} />
              ))}
              {!subclassFeatures.length ? (
                <EmptyLine>No subclass features loaded for this subclass.</EmptyLine>
              ) : null}
            </Stack>
          </ScrollWell>
        ) : null}
      </Stack>
    </BuilderPanel>
  );
}
