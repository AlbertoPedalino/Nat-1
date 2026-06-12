import { memo } from 'react';
import { Box, Card, CardContent, Chip, Divider, Grid, Paper, Stack, Typography } from '@mui/material';
import { Feather, Languages, Layers, Shield, Sparkles, Sword } from 'lucide-react';
import { STAT_LABELS, STATS } from '../constants.js';
import { calcMaxHp, formatMod, getAllFinalScores, getPrimaryClassLevel } from '../logic/calculations.js';
import { installedRegistry } from '../../../adapters/index.js';
import { collectAllProficiencies, collectEquipmentProficiencySets } from '../../charsheet/logic/proficiencies.js';
import { collectPreviewDefenseSections, collectPreviewEffectProficiencySections } from '../../charsheet/logic/sheetEffects.js';
import { collapseWeaponProficiencies, uniqueDisplayLabels } from '../../../shared/character/proficiencyDisplay.js';
import {
  parseTypedProficiencyValue,
  extractFixedProficiencyLabels,
} from '../../../shared/character/typedProficiencies.js';
import { collectResolvedWeaponMasteries } from '../../../shared/character/weaponMastery.js';
import { EntryBlocks } from '../../../shared/character/EntryBlocks.jsx';
import { EntryAccordion, splitNamedEntries } from '../../../shared/character/EntryAccordion.jsx';
import { collectAcFormulas, getEquippedArmor, getEquippedShield, computeAcFormulaValue } from '../../../shared/character/ac.js';
import { collectOwnedFeatNames } from '../../../shared/character/selectedFeats.js';
import { buildPreviewSheetCharacter } from '../logic/previewSheet.js';

import { ENTITY_COLORS as SOURCE_COLOR, NEUTRAL_TONE } from '../../../shared/entityColors.js';

const darkChipText = '#17120d';
const PROFICIENCY_TONE = NEUTRAL_TONE;


const PANEL_SX = {
  p: 1.25,
  position: { md: 'sticky' },
  top: 64,
  maxHeight: { md: 'calc(100vh - 76px)' },
  overflow: 'auto',
  minWidth: 0,
  borderColor: 'rgba(237, 212, 138, 0.22)',
  bgcolor: 'rgba(17, 16, 14, 0.72)',
};

const SECTION_CARD_SX = {
  minWidth: 0,
  borderColor: 'rgba(237, 212, 138, 0.18)',
  bgcolor: 'rgba(255, 255, 255, 0.025)',
  backgroundImage: 'none',
};

const SECTION_HEADER_SX = {
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: '0.66rem',
  fontWeight: 800,
  lineHeight: 1.2,
};

function EmptyCaption({ children }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.45 }}>
      {children}
    </Typography>
  );
}

function PreviewSection({ icon: Icon, title, subtitle, tone = NEUTRAL_TONE, children, emptyText }) {
  const hasContent = Boolean(children);
  return (
    <Card variant="outlined" sx={SECTION_CARD_SX}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Stack spacing={0.85} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            {Icon ? <Icon size={15} color={tone} /> : null}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ ...SECTION_HEADER_SX, color: tone }} noWrap>
                {title}
              </Typography>
              {subtitle ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', lineHeight: 1.2 }} noWrap>
                  {subtitle}
                </Typography>
              ) : null}
            </Box>
          </Stack>
          {hasContent ? children : emptyText ? <EmptyCaption>{emptyText}</EmptyCaption> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function InlineMetadata({ items }) {
  const visibleItems = items.filter((item) => item.value != null && item.value !== '');
  if (!visibleItems.length) return null;

  return (
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', lineHeight: 1.2 }}>
      {visibleItems.map((item, index) => (
        <Box component="span" key={item.key}>
          {index > 0 ? (
            <Box component="span" aria-hidden="true" sx={{ mx: 0.65, color: 'text.disabled' }}>
              ·
            </Box>
          ) : null}
          <Box component="span" sx={item.sx}>
            {item.value}
          </Box>
        </Box>
      ))}
    </Typography>
  );
}

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
    <Card variant="outlined" sx={{ ...SECTION_CARD_SX, borderColor: 'rgba(237, 212, 138, 0.32)' }}>
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
      {STATS.map((stat) => (
        <Grid key={stat} item xs={4}>
          <Card variant="outlined" sx={{ textAlign: 'center', ...SECTION_CARD_SX }}>
            <CardContent sx={{ p: 0.65, '&:last-child': { pb: 0.65 } }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.61rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                {STAT_LABELS[stat]}
              </Typography>
              <Typography variant="h2" sx={{ fontSize: '1rem', lineHeight: 1.15, color: 'text.primary' }}>
                {scores[stat] ?? '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.68rem' }}>
                {formatMod(scores[stat])}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function filledChipSx(bg) {
  return {
    backgroundColor: bg,
    color: darkChipText,
    fontWeight: 700,
    border: '1px solid rgba(255, 232, 176, 0.65)',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.28) inset',
    '& .MuiChip-label': { color: darkChipText },
  };
}

function outlinedChipSx(color) {
  return {
    color,
    borderColor: color,
    fontWeight: 700,
    '& .MuiChip-label': { color },
  };
}

function PreviewChipList({ items, tone = PROFICIENCY_TONE, getKey = (item) => item, getLabel = (item) => item }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.45, mt: 0.45, width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
      {items.map((item) => (
        <Chip
          key={getKey(item)}
          size="small"
          variant="outlined"
          label={getLabel(item)}
          sx={{
            ...outlinedChipSx(tone),
            flex: '0 1 auto',
            minWidth: 0,
            height: 20,
            maxWidth: '100%',
            '& .MuiChip-label': {
              color: tone,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '0.61rem',
              fontWeight: 700,
            },
          }}
        />
      ))}
    </Box>
  );
}

// Shared 5etools entry renderer at the preview's compact type scale.
function PreviewEntryText({ entries }) {
  return (
    <Box sx={{ minWidth: 0, wordBreak: 'break-word', '& .MuiTypography-root': { fontSize: '0.75rem', lineHeight: 1.45 } }}>
      <EntryBlocks entries={entries} emptyText="" />
    </Box>
  );
}

function getFeatureBody(feature) {
  if (!feature || typeof feature !== 'object') return feature;
  if (feature.entries != null) return feature.entries;
  if (feature.entry != null) return feature.entry;
  if (feature.type === 'list' || feature.type === 'table') {
    const { name, ...body } = feature;
    return body;
  }
  if (feature.items != null) return feature.items;
  if (feature.rows != null) return feature.rows;
  return null;
}

// Preview-pane feature row: compact (dense) accordion with a tone-colored title
// plus optional sublabel/runtime chips above the body. Reuses the shared
// EntryAccordion shell; the chip stack + compact body live here as `children`.
function FeatureWithChips({ entry, source, extraSublabel }) {
  const { feature, runtimeChips } = entry;
  const tone = SOURCE_COLOR[source] || SOURCE_COLOR.class;
  const body = getFeatureBody(feature);
  const hasBody = Array.isArray(body) ? body.length > 0 : body != null && body !== '';
  return (
    <EntryAccordion title={feature.name} tone={tone} titleColor={tone} dense>
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        {extraSublabel ? <Chip size="small" variant="outlined" label={extraSublabel} sx={{ ...outlinedChipSx(tone), alignSelf: 'flex-start', height: 20, fontSize: '0.62rem' }} /> : null}
        {runtimeChips?.length ? (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {runtimeChips.map((chip, idx) => (
              <Chip key={`rt-${idx}`} size="small" label={chip} sx={{ ...outlinedChipSx(NEUTRAL_TONE), height: 20, fontSize: '0.62rem', bgcolor: 'rgba(215, 173, 82, 0.12)' }} />
            ))}
          </Stack>
        ) : null}
        {hasBody ? <PreviewEntryText entries={body} /> : (
          <Typography variant="caption" component="div" color="text.secondary" sx={{ lineHeight: 1.45, wordBreak: 'break-word' }}>
            No description.
          </Typography>
        )}
      </Stack>
    </EntryAccordion>
  );
}

// Named 5etools entries as collapsed accordion rows (description only on
// expand); unnamed intro text is grouped under a leading "Description" row.
function EntryAccordions({ source, entries }) {
  return splitNamedEntries(entries).map((feature, index) => (
    <FeatureWithChips key={`${feature.name}-${index}`} entry={{ feature }} source={source} />
  ));
}

function hasDescriptionEntries(entries) {
  if (entries == null || entries === '') return false;
  return !Array.isArray(entries) || entries.length > 0;
}

function LevelGroup({ level, classFeatures, subFeatures }) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.4 }}>
        <Divider sx={{ flex: 1, borderColor: 'rgba(237,212,138,0.22)' }} />
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
        <Divider sx={{ flex: 1, borderColor: 'rgba(237,212,138,0.22)' }} />
      </Box>
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        {classFeatures.map((entry) => (
          <FeatureWithChips key={`c-${entry.feature.name}-${entry.feature.level}`} entry={entry} source="class" />
        ))}
        {subFeatures.map((entry) => (
          <FeatureWithChips key={`s-${entry.feature.name}-${entry.feature.level}`} entry={entry} source="subclass" extraSublabel="sub" />
        ))}
      </Stack>
    </Stack>
  );
}

function uniqueClean(values) {
  return uniqueDisplayLabels(values);
}

function choiceKeyCanGrantSkill(key) {
  const lk = String(key || '').toLowerCase();
  return lk.includes('skill') || lk.includes('exp_') || lk.includes('expertise');
}

function collectSkillProficiencies(character) {
  const out = [];
  const pushSkill = (value) => {
    const parsed = parseTypedProficiencyValue(value);
    if (!parsed.label) return;
    if (parsed.kind && parsed.kind !== 'skill') return;
    out.push(parsed.label);
  };
  const pushFixed = (blocks) => {
    extractFixedProficiencyLabels(blocks).forEach((label) => out.push(label));
  };

  const fromSelected = Array.isArray(character.selectedSkills)
    ? character.selectedSkills
    : [
      ...(character.selectedSkills?.proficient || []),
      ...(character.selectedSkills?.expertise || []),
      ...(character.selectedSkills?.expert || []),
    ];
  fromSelected.forEach(pushSkill);
  (character.normalizedChoices?.skills || []).forEach(pushSkill);
  (character.normalizedChoices?.expertise || []).forEach(pushSkill);

  pushFixed(character.backgroundSnapshot?.skillProficiencies || character.backgroundObj?.skillProficiencies);
  pushFixed(character.speciesSnapshot?.skillProficiencies || character.speciesObj?.skillProficiencies);
  [
    ...(character.allFeatures || []),
    ...(character.allSubFeatures || []),
    ...((character.extraClasses || []).flatMap((extra) => [
      ...(extra.allFeatures || []),
      ...(extra.allSubFeatures || []),
    ])),
    ...(character.allFeatSnapshots || []),
  ].forEach((feature) => {
    pushFixed(feature?.skillProficiencies);
  });

  Object.entries(character.choices || {})
    .filter(([key]) => choiceKeyCanGrantSkill(key))
    .forEach(([, value]) => {
      (Array.isArray(value) ? value : [value]).forEach(pushSkill);
    });

  return uniqueClean(out);
}

function mergePreviewSection(sections, title, items, prepend = false) {
  const cleaned = title === 'Weapons' ? collapseWeaponProficiencies(items) : uniqueClean(items);
  if (!cleaned.length) return;
  const existing = sections.find((section) => section.title === title);
  if (existing) {
    existing.items = title === 'Weapons' ? collapseWeaponProficiencies([...existing.items, ...cleaned]) : uniqueClean([...existing.items, ...cleaned]);
    return;
  }
  const next = { title, items: cleaned };
  if (prepend) sections.unshift(next);
  else sections.push(next);
}

function collectPreviewProficiencies(character) {
  const sheetLike = buildPreviewSheetCharacter(character);
  const sections = collectAllProficiencies(sheetLike, collectEquipmentProficiencySets(sheetLike)).map((section) => ({
    title: section.title,
    items: section.title === 'Weapons' ? collapseWeaponProficiencies(section.items) : uniqueClean(section.items),
  }));

  collectPreviewDefenseSections(sheetLike).forEach((section) => {
    mergePreviewSection(sections, section.title, section.items);
  });

  collectPreviewEffectProficiencySections(sheetLike).forEach((section) => {
    if (section.title === 'Armor Training' || section.title === 'Weapon Training') return;
    mergePreviewSection(sections, section.title, section.items);
  });

  const skillItems = collectSkillProficiencies(character);
  if (skillItems.length) mergePreviewSection(sections, 'Skills', skillItems, true);

  return sections.filter((section) => section.items.length);
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

function normName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function ClassSection({ icon: Icon, title, subtitle, classFeatures, subFeatures, subclassName, level, runtimeActions, runtimeResources }) {
  const valid = classFeatures.filter((feature) => !feature?.isReprinted && (feature.level || 0) <= level);
  const validSub = subFeatures.filter((feature) => !feature?.isReprinted && (feature.level || 0) <= level && feature.subclassShortName === subclassName);
  const runtimeByName = new Map();
  (runtimeActions || []).forEach((action) => runtimeByName.set(normName(action.name), { ...action, kind: 'action' }));
  (runtimeResources || []).forEach((resource) => {
    const key = normName(resource.name);
    const existing = runtimeByName.get(key);
    runtimeByName.set(key, { ...(existing || {}), name: resource.name, max: resource.max, recharge: resource.recharge, kind: existing ? existing.kind : 'resource' });
  });

  const enrich = (feature) => {
    const rt = runtimeByName.get(normName(feature.name));
    if (!rt) return null;
    runtimeByName.delete(normName(feature.name));
    const maxValue = typeof rt.max === 'function' ? rt.max(level) : rt.max;
    const chips = [];
    if (rt.uses) chips.push(rt.uses);
    if (rt.recharge) chips.push(rt.recharge);
    if (maxValue != null) chips.push(`Max ${maxValue}`);
    return chips;
  };

  const byLevel = {};
  valid.forEach((feature) => {
    const lv = feature.level || 1;
    if (!byLevel[lv]) byLevel[lv] = { c: [], s: [] };
    byLevel[lv].c.push({ feature, runtimeChips: enrich(feature) });
  });
  validSub.forEach((feature) => {
    const lv = feature.level || 1;
    if (!byLevel[lv]) byLevel[lv] = { c: [], s: [] };
    byLevel[lv].s.push({ feature, runtimeChips: enrich(feature) });
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

function normalizedName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function collectPreviewFeats(character, feats) {
  const ownedNames = collectOwnedFeatNames(character);
  if (!ownedNames.length) return [];

  const byName = new Map();
  [
    ...(character.allFeatSnapshots || []),
    ...(feats || []),
  ].forEach((feat) => {
    const key = normalizedName(feat?.name);
    if (key && !byName.has(key)) byName.set(key, feat);
  });

  return ownedNames.map((name) => {
    const feat = byName.get(normalizedName(name));
    return feat ? { ...feat, name: feat.name || name } : { name, entries: [] };
  });
}

function PreviewFeat({ feat }) {
  if (hasDescriptionEntries(feat.entries)) {
    return <FeatureWithChips entry={{ feature: feat }} source="feat" />;
  }
  return <FeatNameCard name={feat.name} />;
}

function PreviewPaneImpl({ character, items = [], feats = [], adaptersVersion = 0 }) {
  const scores = getAllFinalScores(character);
  const hp = calcMaxHp(character);
  const primaryLv = getPrimaryClassLevel(character);
  const proficiencySections = collectPreviewProficiencies(character);
  const weaponMasteries = collectResolvedWeaponMasteries(character, items);
  const previewFeats = collectPreviewFeats(character, feats);
  const species = character.speciesObj || character.speciesSnapshot;
  const background = character.backgroundObj || character.backgroundSnapshot;

  const classActions = installedRegistry
    .getClassSheetActions(character.className)
    .filter((action) => !action.minLevel || primaryLv >= Number(action.minLevel));
  const classResources = installedRegistry
    .getClassSheetResources(character.className)
    .filter((resource) => !resource.minLevel || primaryLv >= Number(resource.minLevel));
  const subclassActions = character.subclassShortName
    ? installedRegistry.getSubclassSheetActions(character.className, character.subclassShortName)
      .filter((action) => !action.minLevel || primaryLv >= Number(action.minLevel))
      .map((action) => ({ ...action, fromSubclass: true }))
    : [];
  const subclassResources = character.subclassShortName
    ? installedRegistry.getSubclassSheetResources(character.className, character.subclassShortName)
      .filter((resource) => !resource.minLevel || primaryLv >= Number(resource.minLevel))
    : [];

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
            runtimeActions={[...classActions, ...subclassActions]}
            runtimeResources={[...classResources, ...subclassResources]}
          />
        ) : null}

        {(character.extraClasses || []).map((extra, index) => {
          const ecLv = extra.level || 1;
          const ecActions = installedRegistry.getClassSheetActions(extra.name).filter((action) => !action.minLevel || ecLv >= Number(action.minLevel));
          const ecResources = installedRegistry.getClassSheetResources(extra.name).filter((resource) => !resource.minLevel || ecLv >= Number(resource.minLevel));
          const ecSubActions = extra.subclassShortName
            ? installedRegistry.getSubclassSheetActions(extra.name, extra.subclassShortName)
              .filter((action) => !action.minLevel || ecLv >= Number(action.minLevel))
              .map((action) => ({ ...action, fromSubclass: true }))
            : [];
          const ecSubResources = extra.subclassShortName
            ? installedRegistry.getSubclassSheetResources(extra.name, extra.subclassShortName)
              .filter((resource) => !resource.minLevel || ecLv >= Number(resource.minLevel))
            : [];
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
                runtimeActions={[...ecActions, ...ecSubActions]}
                runtimeResources={[...ecResources, ...ecSubResources]}
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
              {previewFeats.map((feat) => (
                <PreviewFeat key={normalizedName(feat.name)} feat={feat} />
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
  && prev.adaptersVersion === next.adaptersVersion
));
