import { Box, Button, Stack, Typography } from '@mui/material';
import { equipmentTypeCandidates } from '../../../shared/content/catalogs/equipmentTypes.js';
import {
  flattenEquip,
  collectChoiceBlocks,
  collectEquipmentTypeSlots,
} from './startingEquipment.js';
import { BUILDER_TEXT } from '../layout/builderText.js';
import BuilderBox from '../layout/BuilderBox.jsx';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import TagChip from '../../../shared/ui/TagChip.jsx';

// One source's starting-equipment choices (class or background) in the
// builder's equipment step.

// Human labels for 5etools `equipmentType` codes that resolve to a player choice.
// Keys must match EQUIPMENT_TYPE_MATCHERS in equipmentTypes.js.
const EQUIP_TYPE_LABELS = {
  focusSpellcastingArcane: 'Arcane Focus',
  focusSpellcastingDruidic: 'Druidic Focus',
  focusSpellcastingHoly: 'Holy Symbol',
  instrumentMusical: 'Musical Instrument',
  setGaming: 'Gaming Set',
  toolArtisan: "Artisan's Tools",
  weaponSimple: 'Simple Weapon',
  weaponSimpleMelee: 'Simple Melee Weapon',
  weaponMartial: 'Martial Weapon',
  weaponMartialMelee: 'Martial Melee Weapon',
};

export function StartingEquipmentBlock({ title, eq, prefix, character, items, dispatch }) {
  const blocks = collectChoiceBlocks(eq, prefix);
  const summary = flattenEquip(eq, []).slice(0, 8);
  const typeSlots = collectEquipmentTypeSlots(eq, prefix, blocks, character.equipChoices);
  if (!eq) return null;
  return (
    <BuilderBox title={title}>
      <Stack spacing={1}>
        {blocks.map((block) => (
          <Box key={block.key} sx={{ ...SURFACES.inset, p: 1.25 }}>
            <Typography sx={{ ...BUILDER_TEXT.body, color: 'text.secondary', mb: 1 }}>{block.label}</Typography>
            <Stack spacing={0.75}>
              {block.options.map((option) => {
                const selected = character.equipChoices[block.key] === option.value;
                return (
                  <Button
                    key={`${block.key}-${option.value}`}
                    size="small"
                    variant={selected ? 'contained' : 'outlined'}
                    sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                    onClick={() => dispatch({ type: 'equipment/choose', block, value: option.value })}
                  >
                    {option.value.toUpperCase()}) {option.label}
                  </Button>
                );
              })}
            </Stack>
          </Box>
        ))}
        {typeSlots.map((slot) => {
          const candidates = equipmentTypeCandidates(slot.code, items);
          if (!candidates.length) return null;
          const selectedRef = character.equipChoices[slot.slotKey] || null;
          return (
            <Box key={slot.slotKey} sx={{ ...SURFACES.inset, p: 1.25 }}>
              <Typography sx={{ ...BUILDER_TEXT.body, color: 'text.secondary', mb: 1 }}>
                Choose {EQUIP_TYPE_LABELS[slot.code] || 'item'}
              </Typography>
              <Stack spacing={0.75}>
                {candidates.map((cand) => {
                  const ref = `${cand.name}|${cand.source}`;
                  const selected = selectedRef === ref;
                  return (
                    <Button
                      key={ref}
                      size="small"
                      variant={selected ? 'contained' : 'outlined'}
                      sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                      onClick={() => dispatch({
                        type: 'equipment/select-type-item',
                        key: slot.slotKey,
                        item: { ...cand, qty: 1 },
                        prevRef: selectedRef,
                      })}
                    >
                      {cand.name}
                    </Button>
                  );
                })}
              </Stack>
            </Box>
          );
        })}
        {!blocks.length ? summary.map((line, index) => <TagChip key={`${line}-${index}`} size="medium" label={line} sx={{ justifyContent: 'flex-start' }} />) : null}
      </Stack>
    </BuilderBox>
  );
}
