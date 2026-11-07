import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { ScrollText, Sparkles } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import ChoiceBlock from '../choices/ChoiceBlock.jsx';
import { FeatCategorySlot } from '../choices/FeatSlots.jsx';
import { EntryAccordion } from '../../../shared/content/EntryAccordion.jsx';
import { splitNamedEntries } from '../../../shared/content/entryStructure.js';
import SearchList from '../choices/SearchList.jsx';
import SpellChoiceList from '../spells/SpellChoiceList.jsx';
import { speciesChoiceSpecs } from '../choices/choiceSpecs.js';
import { matchesQuery } from '../../../shared/content/searchText.js';

function SpeciesDetailCard({ species }) {
  if (!species) return null;
  // Species feature data is already split into named sub-entries, so each trait
  // becomes one collapsible row (name visible, description on expand).
  const rows = splitNamedEntries(species.entries);
  return (
    <Box sx={{ minWidth: 0, p: 1 }}>
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h2" sx={{ flex: 1, minWidth: 0 }}>{species.name}</Typography>
          <Chip size="small" label={species.source || ''} />
        </Stack>
        <Divider />
        {rows.length ? (
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            {rows.map((row, index) => (
              <EntryAccordion key={`${row.name}-${index}`} title={row.name} entries={row.entries} />
            ))}
          </Stack>
        ) : (
          <Typography sx={{ color: 'text.secondary' }}>No description available.</Typography>
        )}
      </Stack>
    </Box>
  );
}

export default function SpeciesStep({ state, dispatch }) {
  const { character, search } = state;
  const species = state.data.species.filter((item) => matchesQuery(search.species, item.name));
  const selectedSpecies = character.speciesObj || species.find((item) => item.name === character.speciesName);

  return (
    <Stack spacing={2}>
      <BuilderPanel id="panel-species" title="Species" icon={Sparkles} note="Species picker. Card sotto mostra dettagli completi.">
        <SearchList
          value={search.species}
          placeholder="Search species"
          items={species}
          selectedName={character.speciesName}
          onSearch={(value) => dispatch({ type: 'search/set', scope: 'species', value })}
          onSelect={(item) => dispatch({ type: 'species/select', name: item.name, source: item.source, speciesObj: item })}
        />
      </BuilderPanel>

      <BuilderPanel id="panel-species-detail" title="Species Detail" icon={ScrollText} note="Traits, speeds, description.">
        {selectedSpecies ? (
          <SpeciesDetailCard species={selectedSpecies} />
        ) : (
          <Typography sx={{ color: 'text.secondary' }}>Select a species.</Typography>
        )}
      </BuilderPanel>

      <BuilderPanel id="panel-species-choices" title="Species Choices" icon={Sparkles}>
        <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
          Active species: {character.speciesName}
        </Typography>
        <Stack spacing={1.5}>
          {speciesChoiceSpecs(character).map((spec) => {
            if (spec.type === 'feat_cat') {
              return <FeatCategorySlot key={spec.key} spec={spec} feats={state.data.feats} character={character} state={state} dispatch={dispatch} />;
            }
            if (spec.type === 'spell_choice' || spec.type === 'spell_grant') {
              return <SpellChoiceList key={spec.key} spec={spec} state={state} dispatch={dispatch} />;
            }
            return <ChoiceBlock key={spec.key} spec={spec} choices={character.choices} dispatch={dispatch} character={character} />;
          })}
        </Stack>
      </BuilderPanel>
    </Stack>
  );
}
