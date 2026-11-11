import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import ChoiceSpec from '../choices/ChoiceSpec.jsx';
import SearchList from '../choices/SearchList.jsx';
import { getBackgroundPattern, getBackgroundPool } from '../progression/calculations.js';
import { backgroundChoiceSpecs } from '../choices/choiceSpecs.js';
import { extractFixedProficiencyLabels } from '../../../shared/character/progression/typedProficiencies.js';
import { backgroundOriginFeat } from '../../../shared/character/progression/selectedFeats.js';
import { backgroundFeatOptionLabel } from '../../../shared/character/progression/backgroundFeatOptions.js';
import { strip5eMarkup } from '../../../shared/content/entryText.js';
import { titleCase } from '../../../shared/ui/textCase.js';
import { backgroundAbilityBonus, DEFAULT_BACKGROUND_PATTERN } from '../../../shared/character/progression/abilityScores.js';
import { ABILITY_ABBREVIATIONS } from '../../../shared/content/rulesVocabulary.js';
import { matchesQuery } from '../../../shared/content/searchText.js';
import { asArray } from '../../../shared/lists.js';
import { LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { ENTITY_COLORS } from '../../../shared/ui/entityColors.js';
import { BUILDER_TEXT } from '../layout/builderText.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

// One label/value row inside the grants grid (label column + wrapped values).
function GrantRow({ label, values }) {
  if (!values?.length) return null;
  return (
    <>
      <Typography sx={{ ...BUILDER_TEXT.groupLabel, color: UI_COLORS.accentText, whiteSpace: 'nowrap' }}>{label}</Typography>
      <Typography sx={{ ...BUILDER_TEXT.body, color: 'text.primary', minWidth: 0 }}>{values.join(', ')}</Typography>
    </>
  );
}

// Backgrounds encode their summary inside `entries` (Ability Scores, Feat,
// Skill/Tool Proficiencies, Equipment). Newer sources use list `{type:'item'}`
// nodes ({name, entry}); older ones use "{@b Label:} value" strings. Pull each
// labeled fact out so the detail card shows the same info as the preview.
function factValue(node) {
  const raw = node?.entry != null ? node.entry : node?.entries;
  const parts = asArray(raw);
  return strip5eMarkup(parts.filter((part) => typeof part === 'string').join(' ')).trim();
}

function extractBackgroundFacts(background) {
  const out = [];
  const visit = (node) => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (typeof node === 'object') {
      if (node.type === 'item' && node.name) {
        const label = strip5eMarkup(node.name).replace(/:\s*$/, '').trim();
        const value = factValue(node);
        if (label && value) out.push({ label, value });
        return;
      }
      (node.items || []).forEach(visit);
      (node.entries || []).forEach(visit);
      return;
    }
    if (typeof node === 'string') {
      const match = node.match(/^\{@b\s+(.+?):?\}\s*:?\s*(.*)$/s);
      if (match) out.push({ label: match[1].trim(), value: strip5eMarkup(match[2]).trim() });
    }
  };
  visit(Array.isArray(background?.entries) ? background.entries : []);
  return out;
}

function extractBackgroundLore(background) {
  if (background?._lore) return strip5eMarkup(background._lore);
  const entries = background?.entries;
  if (!Array.isArray(entries)) return '';
  const first = entries[0];
  if (typeof first === 'string') return strip5eMarkup(first);
  if (first?.type === 'entries' && Array.isArray(first.entries)) {
    const inner = first.entries[0];
    if (typeof inner === 'string') return strip5eMarkup(inner);
  }
  return '';
}

function BackgroundDetailCard({ background }) {
  if (!background) return null;
  const fixedSkills = extractFixedProficiencyLabels(background.skillProficiencies);
  const fixedTools = extractFixedProficiencyLabels(background.toolProficiencies);
  const fixedLangs = extractFixedProficiencyLabels(background.languageProficiencies);
  const originFeat = backgroundFeatOptionLabel(background);
  const lore = extractBackgroundLore(background);
  const facts = extractBackgroundFacts(background);

  return (
    <Box sx={{ minWidth: 0, p: 1 }}>
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ ...BUILDER_TEXT.cardTitle, flex: 1, minWidth: 0 }}>{background.name}</Typography>
          <MiniBadge label={background.source || ''} color={UI_COLORS.textSecondary} />
        </Stack>
        {lore ? (
          <Typography sx={{ ...BUILDER_TEXT.note, lineHeight: LINE_HEIGHTS.relaxed }}>
            {lore}
          </Typography>
        ) : null}
        <Divider />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1.5, rowGap: 0.75, alignItems: 'baseline', minWidth: 0 }}>
          {facts.length ? (
            facts.map((fact) => <GrantRow key={fact.label} label={fact.label} values={[fact.value]} />)
          ) : (
            <>
              <GrantRow label="Origin Feat" values={originFeat ? [originFeat] : []} />
              <GrantRow label="Skills" values={fixedSkills.map(titleCase)} />
              <GrantRow label="Tools" values={fixedTools.map(titleCase)} />
              <GrantRow label="Languages" values={fixedLangs.map(titleCase)} />
            </>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

export default function BackgroundStep({ state, dispatch }) {
  const { character, search } = state;
  const backgrounds = state.data.backgrounds.filter((item) => matchesQuery(search.background, item.name));
  const selectedBackground = character.backgroundObj || backgrounds.find((item) => item.name === character.backgroundName);
  const abilityPool = getBackgroundPool(selectedBackground);
  const patterns = selectedBackground?.ability?.map((_, index) => getBackgroundPattern(selectedBackground, index)) || [[...DEFAULT_BACKGROUND_PATTERN]];

  return (
    <Stack spacing={2}>
      <BuilderPanel id="panel-bg" tone={ENTITY_COLORS.background} title="Background" icon={GAME_ICONS.background} note="Pick a background; the card below shows its full details.">
        <SearchList
          value={search.background}
          placeholder="Search background"
          items={backgrounds}
          selectedName={character.backgroundName}
          onSearch={(value) => dispatch({ type: 'search/set', scope: 'background', value })}
          onSelect={(item) => {
            const origin = backgroundOriginFeat(item);
            dispatch({ type: 'background/select', name: item.name, source: item.source, feat: origin?.fixed || null, classHint: origin?.classHint || null, backgroundObj: item });
          }}
          meta={(item) => {
            const featLabel = backgroundFeatOptionLabel(item);
            return (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 1.5 }}>
                {(item.abilities || getBackgroundPool(item)).map((ability) => (
                  <MiniBadge key={ability} label={ABILITY_ABBREVIATIONS[ability]} color={ENTITY_COLORS.background} />
                ))}
                {featLabel ? <MiniBadge label={featLabel} color={ENTITY_COLORS.background} /> : null}
              </Stack>
            );
          }}
        />
      </BuilderPanel>

      <BuilderPanel id="panel-bg-detail" tone={ENTITY_COLORS.background} title="Background Detail" icon={GAME_ICONS.background} note="Granted proficiencies, origin feat, description.">
        {selectedBackground ? (
          <BackgroundDetailCard background={selectedBackground} />
        ) : (
          <Typography sx={{ color: 'text.secondary' }}>Select a background.</Typography>
        )}
      </BuilderPanel>

      <BuilderPanel id="panel-bg-ability" tone={ENTITY_COLORS.background} title="Background Ability Bonus" icon={GAME_ICONS.abilityScores}>
        <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
          Choose +2/+1 or +1/+1/+1 from selected background ability pool.
        </Typography>
        <Stack spacing={1.5}>
          {patterns.length > 1 ? (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {patterns.map((pattern, index) => (
                <Chip
                  key={pattern.join('-')}
                  label={pattern.map((value) => `+${value}`).join('/')}
                  color={character.backgroundPatternIdx === index ? 'primary' : 'default'}
                  onClick={() => dispatch({ type: 'background/pattern', index })}
                />
              ))}
            </Stack>
          ) : null}
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {abilityPool.map((stat) => {
              const bonus = backgroundAbilityBonus(character, stat);
              return (
                <Button
                  key={stat}
                  variant={character.backgroundAbilities.includes(stat) ? 'contained' : 'outlined'}
                  onClick={() => dispatch({ type: 'background/ability-toggle', stat })}
                >
                  {ABILITY_ABBREVIATIONS[stat]} {bonus ? `+${bonus}` : ''}
                </Button>
              );
            })}
          </Stack>
        </Stack>
      </BuilderPanel>

      <BuilderPanel id="panel-bg-choices" tone={ENTITY_COLORS.background} title="Background Choices" icon={GAME_ICONS.background} note="Origin feat + skill/tool/language picks.">
        <Stack spacing={1.5}>
          {backgroundChoiceSpecs(character).map((spec) => (
            <ChoiceSpec key={spec.key} spec={spec} state={state} dispatch={dispatch} />
          ))}
        </Stack>
      </BuilderPanel>
    </Stack>
  );
}
