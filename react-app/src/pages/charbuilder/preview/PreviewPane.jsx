import { memo } from 'react';
import { Box, Card, CardContent, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { collectResolvedWeaponMasteries } from '../../../shared/character/combat/weaponMastery.js';
import { partitionNamedEntries } from '../../../shared/content/entryStructure.js';
import {
  collectAcFormulas, getEquippedArmor, computeAcFormulaValue,
} from '../../../shared/character/combat/ac.js';
import { featDescriptionEntries } from '../../../shared/character/progression/featDescription.js';

import { ENTITY_COLORS as SOURCE_COLOR, chipTintStyle } from '../../../shared/ui/entityColors.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { abilityModifier } from '../../../shared/character/progression/abilityModifier.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { builtAbilityScores } from '../../../shared/character/progression/abilityScores.js';
import { computeMaxHp } from '../../../shared/character/combat/hp.js';
import { ABILITIES, ABILITY_ABBREVIATIONS } from '../../../shared/content/rulesVocabulary.js';
import { collectPreviewProficiencies, collectPreviewFeats } from './previewData.js';
import {
  PROFICIENCY_TONE, PreviewSection, InlineMetadata, PreviewChipList, PreviewEntryText, FeatureAccordion, EntryAccordions, hasDescriptionEntries,
} from './PreviewParts.jsx';
import { FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import CharacterName from '../../../shared/character/profile/CharacterName.jsx';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { sheetBoxSx } from '../../../shared/ui/PanelHeader.jsx';
import { BUILDER_TEXT } from '../layout/builderText.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

// The preview column: the sunken well its panels sit in, kept in view.
const PANEL_SX = {
  ...SURFACES.inset,
  p: 1.25,
  position: { md: 'sticky' },
  top: 64,
  maxHeight: { md: 'calc(100vh - 76px)' },
  overflow: 'auto',
  minWidth: 0,
};

function PreviewHeader({ character, hp }) {
  const subtitle = [
    `Lv ${character.level || 1}`,
    character.speciesName,
    character.className,
  ].filter(Boolean).join(' ');
  const metadata = [
    { key: 'identity', value: subtitle || 'No class selected' },
    { key: 'hp', value: `${hp ?? '-'} HP`, sx: { color: UI_COLORS.accentText, fontWeight: FONT_WEIGHTS.heavy } },
  ];

  return (
    <PreviewSection icon={GAME_ICONS.preview} title="Preview">
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <CharacterName name={character.name} sx={BUILDER_TEXT.characterName} />
        <InlineMetadata items={metadata} />
      </Stack>
    </PreviewSection>
  );
}

function AbilityScoreGrid({ scores }) {
  return (
    <Grid container spacing={0.5}>
      {ABILITIES.map((stat) => (
        <Grid key={stat} size={{ xs: 4 }}>
          <Card variant="outlined" sx={{ ...sheetBoxSx, textAlign: 'center', minWidth: 0 }}>
            <CardContent sx={{ p: 0.75, '&:last-child': { pb: 0.75 } }}>
              <Typography sx={{ ...BUILDER_TEXT.boxTitle, color: 'text.secondary', mb: 0 }}>
                {ABILITY_ABBREVIATIONS[stat]}
              </Typography>
              <Typography sx={{ ...BUILDER_TEXT.figure, color: 'text.primary' }}>
                {scores[stat] ?? '-'}
              </Typography>
              <Typography sx={BUILDER_TEXT.caption}>
                {signed(abilityModifier(scores[stat]))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function LevelGroup({ level, classFeatures, subFeatures }) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
        <Divider sx={{ flex: 1, borderColor: uiAlpha(UI_COLORS.accentText, OPACITY.shade) }} />
        <Chip
          size="small"
          label={`Level ${level}`}
          sx={{
            ...chipTintStyle(UI_COLORS.accentText),
            height: CONTROL_HEIGHTS.sm,
            '& .MuiChip-label': BUILDER_TEXT.chipLabel,
          }}
        />
        <Divider sx={{ flex: 1, borderColor: uiAlpha(UI_COLORS.accentText, OPACITY.shade) }} />
      </Box>
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        {classFeatures.map((feature) => (
          <FeatureAccordion key={`c-${feature.name}-${feature.level}`} feature={feature} source="class" />
        ))}
        {subFeatures.map((feature) => (
          <FeatureAccordion key={`s-${feature.name}-${feature.level}`} feature={feature} source="subclass" />
        ))}
      </Stack>
    </Stack>
  );
}

function AcFormulasSection({ character }) {
  const formulas = collectAcFormulas(character);
  if (!formulas.length) return null;
  // The armor the character starts wearing blocks the formulas that need none.
  const hasArmor = !!getEquippedArmor(character, character.inventory || []);
  return (
    <PreviewSection icon={GAME_ICONS.armorClass} title="Defense" subtitle="Armor Class formulas">
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        {formulas.map((f) => {
          const val = computeAcFormulaValue(character, f);
          const abils = (f.abilities || []).map((a) => a.toUpperCase());
          const blocked = (f.requiresNoArmor && hasArmor) ? 'Blocked: wearing armor' : '';
          return (
            <Box key={f.key} sx={{ minWidth: 0 }}>
              <Typography sx={{ ...BUILDER_TEXT.value, color: 'text.primary', lineHeight: LINE_HEIGHTS.snug }}>
                {f.label}: {val}
              </Typography>
              <Typography sx={BUILDER_TEXT.itemMeta}>
                {f.base} + {abils.join(' + ')}{blocked ? ` — ${blocked}` : ''}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </PreviewSection>
  );
}

function ProficiencySection({ sections }) {
  if (!sections.length) return null;
  return (
    <PreviewSection icon={GAME_ICONS.proficiencies} title="Proficiencies" subtitle="Skills, equipment, languages" tone={PROFICIENCY_TONE}>
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        {sections.map((section) => (
          <Box key={section.title} sx={{ minWidth: 0 }}>
            <Typography sx={{ ...BUILDER_TEXT.groupLabel, color: PROFICIENCY_TONE }}>
              {section.title}
            </Typography>
            <PreviewChipList
              items={section.items}
              getKey={(item) => `${section.title}-${item}`}
            />
          </Box>
        ))}
      </Stack>
    </PreviewSection>
  );
}

function WeaponMasterySection({ items }) {
  if (!items.length) return null;
  return (
    <PreviewSection icon={GAME_ICONS.attack} title="Weapon Masteries" tone={PROFICIENCY_TONE}>
      <PreviewChipList
        items={items}
        getKey={(item) => `${item.weaponName}-${item.mastery || 'none'}`}
        getLabel={(item) => item.mastery ? `${item.weaponName} — ${item.mastery}` : item.weaponName}
      />
    </PreviewSection>
  );
}

function ClassSection({ icon: Icon, title, subtitle, classFeatures, subFeatures, subclassName, level }) {
  const valid = classFeatures.filter((feature) => !feature?.isReprinted && (feature.level || 0) <= level);
  const validSub = subFeatures.filter((feature) => !feature?.isReprinted && (feature.level || 0) <= level && feature.subclassShortName === subclassName);

  const byLevel = {};
  valid.forEach((feature) => {
    const lv = feature.level || 1;
    if (!byLevel[lv]) byLevel[lv] = { c: [], s: [] };
    byLevel[lv].c.push(feature);
  });
  validSub.forEach((feature) => {
    const lv = feature.level || 1;
    if (!byLevel[lv]) byLevel[lv] = { c: [], s: [] };
    byLevel[lv].s.push(feature);
  });
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);

  return (
    <PreviewSection icon={Icon} title={title} subtitle={subtitle} tone={SOURCE_COLOR.class} emptyText="No class features yet.">
      {levels.length ? (
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          {levels.map((lv) => (
            <LevelGroup
              key={`lvg-${lv}`}
              level={lv}
              classFeatures={byLevel[lv].c}
              subFeatures={byLevel[lv].s}
            />
          ))}
        </Stack>
      ) : null}
    </PreviewSection>
  );
}

function FeatNameCard({ name }) {
  return (
    <Card variant="outlined" sx={{ minWidth: 0, borderLeft: `3px solid ${SOURCE_COLOR.feat}` }}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Typography sx={{ ...BUILDER_TEXT.value, color: SOURCE_COLOR.feat }}>
          {name}
        </Typography>
      </CardContent>
    </Card>
  );
}

function PreviewFeat({ feat }) {
  const entries = featDescriptionEntries(feat);
  if (!hasDescriptionEntries(entries)) return <FeatNameCard name={feat.name} />;

  const { introEntries, namedEntries } = partitionNamedEntries(entries);

  return (
    <FeatureAccordion feature={feat} source="feat">
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        {introEntries.length ? <PreviewEntryText entries={introEntries} /> : null}
        {namedEntries.map((row, index) => (
          <FeatureAccordion
            key={`${row.name}-${index}`}
            feature={row}
            source="feat"
          />
        ))}
      </Stack>
    </FeatureAccordion>
  );
}

function PreviewPaneImpl({ character, items = [], feats = [] }) {
  const scores = builtAbilityScores(character);
  const hp = computeMaxHp(character);
  const primaryLv = primaryClassLevel(character);
  const proficiencySections = collectPreviewProficiencies(character, items);
  const weaponMasteries = collectResolvedWeaponMasteries(character, items);
  const previewFeats = collectPreviewFeats(character, feats);
  const species = character.speciesObj || character.speciesSnapshot;
  const background = character.backgroundObj || character.backgroundSnapshot;

  return (
    <Box sx={PANEL_SX}>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <PreviewHeader character={character} hp={hp} />

        <AbilityScoreGrid scores={scores} />

        <AcFormulasSection character={character} />
        <ProficiencySection sections={proficiencySections} />
        <WeaponMasterySection items={weaponMasteries} />

        {character.cls ? (
          <ClassSection
            icon={GAME_ICONS.classes}
            title={character.className || 'Class'}
            subtitle={`Level ${primaryLv}${character.subclassShortName ? ` • ${character.subclassShortName}` : ''}`}
            classFeatures={character.allFeatures || []}
            subFeatures={character.allSubFeatures || []}
            subclassName={character.subclassShortName}
            level={primaryLv}
          />
        ) : null}

        {(character.extraClasses || []).map((extra, index) => {
          const ecLv = extra.level || 1;
          return (
            <Box key={`${extra.name}-${index}`} sx={{ minWidth: 0 }}>
              <ClassSection
                icon={GAME_ICONS.classes}
                title={`Multiclass ${index + 1}: ${extra.name}`}
                subtitle={`Level ${ecLv}${extra.subclassShortName ? ` • ${extra.subclassShortName}` : ''}`}
                classFeatures={extra.allFeatures || []}
                subFeatures={extra.allSubFeatures || []}
                subclassName={extra.subclassShortName}
                level={ecLv}
              />
            </Box>
          );
        })}

        <PreviewSection
          icon={GAME_ICONS.species}
          title="Species"
          subtitle={character.speciesName || 'Not selected'}
          tone={SOURCE_COLOR.species}
          emptyText="No species description yet."
        >
          {hasDescriptionEntries(species?.entries) ? (
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <EntryAccordions source="species" entries={species.entries} />
            </Stack>
          ) : null}
        </PreviewSection>

        <PreviewSection
          icon={GAME_ICONS.background}
          title="Background"
          subtitle={character.backgroundName || 'Not selected'}
          tone={SOURCE_COLOR.background}
          emptyText="No background description yet."
        >
          {hasDescriptionEntries(background?.entries) ? (
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <EntryAccordions source="background" entries={background.entries} />
            </Stack>
          ) : null}
        </PreviewSection>

        {previewFeats.length ? (
          <PreviewSection icon={GAME_ICONS.subclass} title="Feats" tone={SOURCE_COLOR.feat}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              {previewFeats.map((feat, index) => (
                <PreviewFeat key={`${matchKey(feat.name)}-${index}`} feat={feat} />
              ))}
            </Stack>
          </PreviewSection>
        ) : null}

      </Stack>
    </Box>
  );
}

export default memo(PreviewPaneImpl, (prev, next) => (
  prev.character === next.character
  && prev.items === next.items
  && prev.feats === next.feats
));
