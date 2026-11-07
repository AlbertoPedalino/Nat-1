import { memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Feather, Languages, Layers, Shield, Sparkles, Sword } from 'lucide-react';
import {
  getPrimaryClassLevel,
} from '../progression/calculations.js';
import { collectResolvedWeaponMasteries } from '../../../shared/character/combat/weaponMastery.js';
import { partitionNamedEntries } from '../../../shared/content/entryStructure.js';
import {
  collectAcFormulas, getEquippedArmor, computeAcFormulaValue,
} from '../../../shared/character/combat/ac.js';
import { featDescriptionEntries } from '../../../shared/character/progression/featDescription.js';

import { ENTITY_COLORS as SOURCE_COLOR, NEUTRAL_TONE } from '../../../shared/ui/entityColors.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { abilityModifier } from '../../../shared/character/progression/abilityModifier.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { builtAbilityScores } from '../../../shared/character/progression/abilityScores.js';
import { computeMaxHp } from '../../../shared/character/combat/hp.js';
import { ABILITIES, ABILITY_ABBREVIATIONS } from '../../../shared/content/rulesVocabulary.js';
import { collectPreviewProficiencies, collectPreviewFeats } from './previewData.js';
import {
  PROFICIENCY_TONE, SECTION_CARD_SX, SECTION_HEADER_SX, PreviewSection, InlineMetadata, filledChipSx,
  PreviewChipList, PreviewEntryText, FeatureAccordion, EntryAccordions, hasDescriptionEntries,
} from './PreviewParts.jsx';

const PANEL_SX = {
  p: 1.25,
  position: { md: 'sticky' },
  top: 64,
  maxHeight: { md: 'calc(100vh - 76px)' },
  overflow: 'auto',
  minWidth: 0,
  borderColor: uiAlpha(UI_COLORS.goldLight, 0.22),
  bgcolor: uiAlpha(UI_COLORS.inkSoft, 0.72),
};

function PreviewHeader({ character, hp }) {
  const subtitle = [
    `Lv ${character.level || 1}`,
    character.speciesName,
    character.className,
  ].filter(Boolean).join(' ');
  const metadata = [
    { key: 'identity', value: subtitle || 'No class selected' },
    { key: 'hp', value: `${hp ?? '-'} HP`, sx: { color: NEUTRAL_TONE, fontWeight: 800 } },
  ];

  return (
    <Card variant="outlined" sx={{ ...SECTION_CARD_SX, borderColor: uiAlpha(UI_COLORS.goldLight, 0.32) }}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Stack spacing={0.4} sx={{ minWidth: 0 }}>
          <Typography sx={{ ...SECTION_HEADER_SX, color: 'primary.main' }}>Preview</Typography>
          <Typography
            variant="h2"
            noWrap
            sx={{ color: NEUTRAL_TONE, fontSize: '1.15rem', lineHeight: 1.15, fontWeight: 800 }}
          >
            {character.name || 'Unnamed Character'}
          </Typography>
          <InlineMetadata items={metadata} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function AbilityScoreGrid({ scores }) {
  return (
    <Grid container spacing={0.6}>
      {ABILITIES.map((stat) => (
        <Grid key={stat} size={{ xs: 4 }}>
          <Card variant="outlined" sx={{ textAlign: 'center', ...SECTION_CARD_SX }}>
            <CardContent sx={{ p: 0.65, '&:last-child': { pb: 0.65 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.61rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                {ABILITY_ABBREVIATIONS[stat]}
              </Typography>
              <Typography variant="h2" sx={{ fontSize: '1rem', lineHeight: 1.15, color: 'text.primary' }}>
                {scores[stat] ?? '-'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.68rem' }}>
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.4 }}>
        <Divider sx={{ flex: 1, borderColor: uiAlpha(UI_COLORS.goldLight, 0.22) }} />
        <Chip
          size="small"
          label={`Level ${level}`}
          sx={{
            ...filledChipSx(NEUTRAL_TONE),
            height: 20,
            fontSize: '0.58rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        />
        <Divider sx={{ flex: 1, borderColor: uiAlpha(UI_COLORS.goldLight, 0.22) }} />
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
  return (
    <PreviewSection icon={Shield} title="Defense" subtitle="Armor Class formulas">
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        {formulas.map((f) => {
          const val = computeAcFormulaValue(character, f);
          const abils = (f.abilities || []).map((a) => a.toUpperCase());
          const hasArmor = !!getEquippedArmor(character, []);
          const blocked = (f.requiresNoArmor && hasArmor) ? 'Blocked: wearing armor' : '';
          return (
            <Box key={f.key} sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.25 }}>
                {f.label}: {val}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1.35 }}>
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
    <PreviewSection icon={Languages} title="Proficiencies" subtitle="Skills, equipment, languages" tone={PROFICIENCY_TONE}>
      <Stack spacing={0.85} sx={{ minWidth: 0 }}>
        {sections.map((section) => (
          <Box key={section.title} sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: PROFICIENCY_TONE,
                fontSize: '0.64rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
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
    <PreviewSection icon={Sword} title="Weapon Masteries" tone={PROFICIENCY_TONE}>
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
        <Stack spacing={0.85} sx={{ minWidth: 0 }}>
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
        <Typography variant="body2" sx={{ color: SOURCE_COLOR.feat, fontWeight: 700 }}>
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
  const primaryLv = getPrimaryClassLevel(character);
  const proficiencySections = collectPreviewProficiencies(character);
  const weaponMasteries = collectResolvedWeaponMasteries(character, items);
  const previewFeats = collectPreviewFeats(character, feats);
  const species = character.speciesObj || character.speciesSnapshot;
  const background = character.backgroundObj || character.backgroundSnapshot;

  return (
    <Paper variant="outlined" sx={PANEL_SX}>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <PreviewHeader character={character} hp={hp} />

        <AbilityScoreGrid scores={scores} />

        <AcFormulasSection character={character} />
        <ProficiencySection sections={proficiencySections} />
        <WeaponMasterySection items={weaponMasteries} />

        {character.cls ? (
          <ClassSection
            icon={Sword}
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
                icon={Shield}
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
          icon={Sparkles}
          title="Species"
          subtitle={character.speciesName || 'Not selected'}
          tone={SOURCE_COLOR.species}
          emptyText="No species description yet."
        >
          {hasDescriptionEntries(species?.entries) ? (
            <Stack spacing={0.6} sx={{ minWidth: 0 }}>
              <EntryAccordions source="species" entries={species.entries} />
            </Stack>
          ) : null}
        </PreviewSection>

        <PreviewSection
          icon={Feather}
          title="Background"
          subtitle={character.backgroundName || 'Not selected'}
          tone={SOURCE_COLOR.background}
          emptyText="No background description yet."
        >
          {hasDescriptionEntries(background?.entries) ? (
            <Stack spacing={0.6} sx={{ minWidth: 0 }}>
              <EntryAccordions source="background" entries={background.entries} />
            </Stack>
          ) : null}
        </PreviewSection>

        {previewFeats.length ? (
          <PreviewSection icon={Layers} title="Feats" tone={SOURCE_COLOR.feat}>
            <Stack spacing={0.6} sx={{ minWidth: 0 }}>
              {previewFeats.map((feat, index) => (
                <PreviewFeat key={`${matchKey(feat.name)}-${index}`} feat={feat} />
              ))}
            </Stack>
          </PreviewSection>
        ) : null}

      </Stack>
    </Paper>
  );
}

export default memo(PreviewPaneImpl, (prev, next) => (
  prev.character === next.character
  && prev.items === next.items
  && prev.feats === next.feats
));
