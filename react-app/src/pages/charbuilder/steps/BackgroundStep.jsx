import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { Feather, GraduationCap, ScrollText, SlidersHorizontal } from 'lucide-react';
import BuilderPanel from '../components/BuilderPanel.jsx';
import ChoiceBlock from '../components/ChoiceBlock.jsx';
import { FeatCategorySlot, FeatFixedSlot } from '../components/FeatSlots.jsx';
import SearchList from '../components/SearchList.jsx';
import { STAT_LABELS } from '../constants.js';
import { getBackgroundPattern, getBackgroundPool } from '../logic/calculations.js';
import { backgroundChoiceSpecs, fixedKeysFromBlocks } from '../logic/choiceSpecs.js';
import { NEUTRAL_TONE } from '../../../shared/entityColors.js';
import { backgroundOriginFeat } from '../../../shared/character/selectedFeats.js';
import { backgroundFeatOptionLabel } from '../../../shared/character/backgroundFeatOptions.js';
import { strip5eMarkup } from '../../../shared/character/spellEntries.js';


function titleCase(value) {
  return String(value || '').replace(/[_-]/g, ' ')
    .replace(/(^|\s)\w/g, (c) => c.toUpperCase())
    .replace(/'\w/g, (m) => m.toLowerCase());
}

// One label/value row inside the grants grid (label column + wrapped values).
function GrantRow({ label, values }) {
  if (!values?.length) return null;
  return (
    <>
      <Typography variant="body2" sx={{ color: NEUTRAL_TONE, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{label}</Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', minWidth: 0 }}>{values.join(', ')}</Typography>
    </>
  );
}

// Backgrounds encode their summary inside `entries` (Ability Scores, Feat,
// Skill/Tool Proficiencies, Equipment). Newer sources use list `{type:'item'}`
// nodes ({name, entry}); older ones use "{@b Label:} value" strings. Pull each
// labeled fact out so the detail card shows the same info as the preview.
function factValue(node) {
  const raw = node?.entry != null ? node.entry : node?.entries;
  const parts = Array.isArray(raw) ? raw : [raw];
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
  const fixedSkills = fixedKeysFromBlocks(background.skillProficiencies || []);
  const fixedTools = fixedKeysFromBlocks(background.toolProficiencies || [], ['choose', 'any', 'anyTool', 'anyArtisansTool', 'anyMusicalInstrument', 'anyGamingSet']);
  const fixedLangs = fixedKeysFromBlocks(background.languageProficiencies || [], ['choose', 'any', 'anyStandard', 'anyExotic']);
  const originFeat = backgroundFeatOptionLabel(background);
  const lore = extractBackgroundLore(background);
  const facts = extractBackgroundFacts(background);

  return (
    <Box sx={{ minWidth: 0, p: 1 }}>
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h2" sx={{ flex: 1, minWidth: 0, color: 'primary.main' }}>{background.name}</Typography>
          <Chip size="small" label={background.source || ''} />
        </Stack>
        {lore ? (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontStyle: 'italic' }}>
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
  const query = search.background.toLowerCase();
  const backgrounds = state.data.backgrounds.filter((item) => item.name.toLowerCase().includes(query));
  const selectedBackground = character.backgroundObj || backgrounds.find((item) => item.name === character.backgroundName);
  const abilityPool = getBackgroundPool(selectedBackground);
  const patterns = selectedBackground?.ability?.map((_, index) => getBackgroundPattern(selectedBackground, index)) || [[2, 1]];

  return (
    <Stack spacing={2}>
      <BuilderPanel id="panel-bg" title="Background" icon={Feather} note="Background picker. Card sotto mostra dettagli completi.">
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
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                {(item.abilities || getBackgroundPool(item)).map((ability) => (
                  <Chip key={ability} size="small" label={STAT_LABELS[ability]} />
                ))}
                {featLabel ? <Chip size="small" label={featLabel} /> : null}
              </Stack>
            );
          }}
        />
      </BuilderPanel>

      <BuilderPanel id="panel-bg-detail" title="Background Detail" icon={ScrollText} note="Granted proficiencies, origin feat, description.">
        {selectedBackground ? (
          <BackgroundDetailCard background={selectedBackground} />
        ) : (
          <Typography color="text.secondary">Select a background.</Typography>
        )}
      </BuilderPanel>

      <BuilderPanel id="panel-bg-ability" title="Background Ability Bonus" icon={SlidersHorizontal}>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          Choose +2/+1 or +1/+1/+1 from selected background ability pool.
        </Typography>
        <Stack spacing={1.5}>
          {patterns.length > 1 ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {abilityPool.map((stat) => {
              const idx = character.backgroundAbilities.indexOf(stat);
              const bonus = idx >= 0 ? character.backgroundPattern[idx] || 0 : 0;
              return (
                <Button
                  key={stat}
                  variant={idx >= 0 ? 'contained' : 'outlined'}
                  onClick={() => dispatch({ type: 'background/ability-toggle', stat })}
                >
                  {STAT_LABELS[stat]} {bonus ? `+${bonus}` : ''}
                </Button>
              );
            })}
          </Stack>
        </Stack>
      </BuilderPanel>

      <BuilderPanel id="panel-bg-choices" title="Background Choices" icon={GraduationCap} note="Origin feat + skill/tool/language picks.">
        <Stack spacing={1.5}>
          {backgroundChoiceSpecs(character).map((spec) => {
            if (spec.type === 'feat_fixed') {
              return <FeatFixedSlot key={spec.key} spec={spec} feats={state.data.feats} character={character} state={state} dispatch={dispatch} />;
            }
            if (spec.type === 'feat_cat') {
              return <FeatCategorySlot key={spec.key} spec={spec} feats={state.data.feats} character={character} state={state} dispatch={dispatch} />;
            }
            return <ChoiceBlock key={spec.key} spec={spec} choices={character.choices} dispatch={dispatch} character={character} />;
          })}
        </Stack>
      </BuilderPanel>
    </Stack>
  );
}
