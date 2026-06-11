import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { ScrollText, Sparkles } from 'lucide-react';
import BuilderPanel from '../components/BuilderPanel.jsx';
import ChoiceBlock from '../components/ChoiceBlock.jsx';
import { FeatCategorySlot } from '../components/FeatSlots.jsx';
import { ExpandableEntryBlocks } from '../../../shared/character/ExpandableEntryBlocks.jsx';
import SearchList from '../components/SearchList.jsx';
import SpellChoiceList from '../components/SpellChoiceList.jsx';
import { speciesChoiceSpecs } from '../logic/choiceSpecs.js';

function SpeciesDetailCard({ species }) {
  if (!species) return null;
  return (
    <Box sx={{ minWidth: 0, p: 1 }}>
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h2" sx={{ flex: 1, minWidth: 0 }}>{species.name}</Typography>
          <Chip size="small" label={species.source || ''} />
        </Stack>
        <Divider />
        {species.entries ? (
          <ExpandableEntryBlocks entries={species.entries} initialBlocks={6} />
        ) : (
          <Typography color="text.secondary">No description available.</Typography>
        )}
      </Stack>
    </Box>
  );
}

export default function SpeciesStep({ state, dispatch }) {
  const { character, search } = state;
  const query = search.species.toLowerCase();
  const species = state.data.species.filter((item) => item.name.toLowerCase().includes(query));
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
          <Typography color="text.secondary">Select a species.</Typography>
        )}
      </BuilderPanel>

      <BuilderPanel id="panel-species-choices" title="Species Choices" icon={Sparkles}>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          Active species: {character.speciesName}
        </Typography>
        <Stack spacing={1.5}>
          {speciesChoiceSpecs(character).map((spec) => {
            if (spec.type === 'feat_cat') {
              return <FeatCategorySlot key={spec.key} spec={spec} feats={state.data.feats} character={character} state={state} dispatch={dispatch} kind="species" />;
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
