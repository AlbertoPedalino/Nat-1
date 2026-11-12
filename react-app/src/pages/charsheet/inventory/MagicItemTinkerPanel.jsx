import { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { getSpellSlots } from '../../../shared/character/spells/spellcasting.js';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { consumePactSlot, consumeSlot, getAvailablePactSlots, getRegularSlotUsed, persistCreatedSlots } from '../../../shared/character/spells/spellSlots.js';
import { classLevel } from '../../../shared/character/progression/classLevel.js';
import { removeOneCrafted } from '../../../shared/character/inventory/craftedItemState.js';
import {
  itemChargeCurrent,
  itemChargeMaximum,
} from '../../../shared/character/inventory/itemCharges.js';
import {
  collectReplicatePlanChoices,
  hasImprovedArmorer,
  replicateChoiceLabel,
  resolveReplicateChoice,
} from '../../../shared/character/inventory/replicateMagicItem.js';
import {
  MAGIC_ITEM_TINKER_DRAIN_RESOURCE,
  MAGIC_ITEM_TINKER_TRANSMUTE_RESOURCE,
  drainSpellSlotLevel,
  isReplicatedItem,
  rechargeReplicatedItem,
  replaceReplicatedItem,
  replicatedNonArmorCount,
  setReplicatedItemCharges,
} from '../../../shared/character/inventory/magicItemTinker.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { useItemsDb } from './useItemsDb.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { itemDisplayName } from '../../../shared/character/inventory/itemIdentity.js';
import { rarityLabel } from '../../../shared/character/inventory/itemRarity.js';
import SelectField from '../../../shared/ui/SelectField.jsx';

const sectionSx = {
  ...SURFACES.panel,
  p: 0.75,
};
const labelSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xs,
  color: UI_COLORS.accentText,
};
const selectSx = { flex: 1, minWidth: 150 };

function availableSlotOptions(regularSlots, pactSlots, sheet) {
  const used = sheet?.spellSlotUsed || {};
  const created = sheet?.createdSpellSlots || {};
  const regular = regularSlots.flatMap((total, index) => {
    const level = index + 1;
    const available = Number(total || 0) - getRegularSlotUsed(used, level) + Number(created[level] || 0);
    return available > 0 ? [{ key: `regular:${level}`, source: 'regular', level, available }] : [];
  });
  const pactAvailable = getAvailablePactSlots(pactSlots, sheet);
  const pact = pactAvailable > 0
    ? [{
        key: `pact:${Number(pactSlots.level)}`,
        source: 'pact',
        level: Number(pactSlots.level),
        available: pactAvailable,
      }]
    : [];
  return [...regular, ...pact];
}

function artificerLevel(character) {
  return classLevel(character, 'Artificer');
}

function baseReplicatedItemLimit(level) {
  if (level >= 18) return 6;
  if (level >= 14) return 5;
  if (level >= 10) return 4;
  if (level >= 6) return 3;
  return level >= 2 ? 2 : 0;
}

export default function MagicItemTinkerPanel({ character, sheet, resources }) {
  const {
    onUpdateInventory,
    onUpdateSheet,
    onUpdateCharacter,
    onNotice,
    setResources,
    readOnly,
  } = useSheetActions();
  const itemsDb = useItemsDb();
  const [chargeSource, setChargeSource] = useState('');
  const [chargeLevel, setChargeLevel] = useState('');
  const [drainSource, setDrainSource] = useState('');
  const [transmuteSource, setTransmuteSource] = useState('');
  const [transmuteTarget, setTransmuteTarget] = useState('');

  const inventory = sheet?.sheetInventory || [];
  const replicated = useMemo(() => inventory.filter(isReplicatedItem), [inventory]);
  const chargeable = useMemo(() => replicated.filter((item) => itemChargeMaximum(item) > 0), [replicated]);
  const drainable = useMemo(() => replicated.filter((item) => drainSpellSlotLevel(item) > 0), [replicated]);
  const plans = useMemo(() => collectReplicatePlanChoices(character), [character?.choices]);
  const planOptions = useMemo(() => plans.flatMap((plan) => {
    const item = resolveReplicateChoice(plan, itemsDb)?.item;
    return item ? [{ plan, item, label: replicateChoiceLabel(plan) }] : [];
  }), [itemsDb, plans]);
  const activePlans = useMemo(() => new Set(replicated.map((item) => String(item.craftedFrom || ''))), [replicated]);
  const targetOptions = useMemo(() => planOptions.filter(({ plan }) => (
    plan !== transmuteSource && !activePlans.has(plan)
  )), [activePlans, planOptions, transmuteSource]);

  const sheetSlots = useMemo(() => getSpellSlots(character), [character]);
  const regularSlots = sheetSlots?.regular || [];
  const pactSlots = sheetSlots?.pact || null;
  const slotOptions = useMemo(
    () => availableSlotOptions(regularSlots, pactSlots, sheet),
    [regularSlots, pactSlots, sheet],
  );
  const selectedSlot = slotOptions.find((option) => option.key === chargeLevel) || null;
  const selectedChargeItem = chargeable.find((item) => String(item.craftedFrom) === chargeSource) || null;
  const selectedDrainItem = drainable.find((item) => String(item.craftedFrom) === drainSource) || null;
  const selectedTarget = planOptions.find((entry) => entry.plan === transmuteTarget) || null;
  const drainUses = Number(resources?.[MAGIC_ITEM_TINKER_DRAIN_RESOURCE] || 0);
  const transmuteUses = Number(resources?.[MAGIC_ITEM_TINKER_TRANSMUTE_RESOURCE] || 0);

  const spendResource = (key) => {
    setResources?.({ ...resources, [key]: Math.max(0, Number(resources?.[key] || 0) - 1) });
  };

  const updateCharges = (delta) => {
    if (!selectedChargeItem || readOnly) return;
    const current = itemChargeCurrent(selectedChargeItem);
    onUpdateInventory?.(setReplicatedItemCharges(inventory, chargeSource, current + delta));
  };

  const chargeItem = () => {
    if (!selectedChargeItem || !selectedSlot || readOnly) return;
    if (itemChargeCurrent(selectedChargeItem) >= itemChargeMaximum(selectedChargeItem)) return;
    const { level, source } = selectedSlot;
    const spent = source === 'pact'
      ? consumePactSlot(pactSlots, sheet, onUpdateSheet, onUpdateCharacter)
      : consumeSlot(regularSlots, sheet, level, onUpdateSheet, onUpdateCharacter);
    if (!spent) return;
    onUpdateInventory?.(rechargeReplicatedItem(inventory, chargeSource, level));
    const sourceLabel = source === 'pact' ? 'Pact Magic slot' : 'spell slot';
    onNotice?.('Charge Magic Item', `${itemDisplayName(selectedChargeItem)} regained up to ${level} charges using a level ${level} ${sourceLabel}.`);
  };

  const drainItem = () => {
    if (!selectedDrainItem || drainUses <= 0 || readOnly) return;
    const level = drainSpellSlotLevel(selectedDrainItem);
    if (!level) return;
    const created = { ...(sheet?.createdSpellSlots || {}) };
    created[level] = Number(created[level] || 0) + 1;
    persistCreatedSlots(created, onUpdateSheet, onUpdateCharacter);
    onUpdateInventory?.(removeOneCrafted(inventory, 'replicated', drainSource));
    spendResource(MAGIC_ITEM_TINKER_DRAIN_RESOURCE);
    onNotice?.('Drain Magic Item', `${itemDisplayName(selectedDrainItem)} vanished; created a level ${level} spell slot.`);
    setDrainSource('');
  };

  const transmuteItem = () => {
    if (!transmuteSource || !selectedTarget || transmuteUses <= 0 || readOnly) return;
    const next = replaceReplicatedItem(inventory, transmuteSource, selectedTarget.plan, selectedTarget.item);
    if (next === inventory) return;
    if (
      hasImprovedArmorer(character)
      && replicatedNonArmorCount(next) > baseReplicatedItemLimit(artificerLevel(character))
    ) {
      onNotice?.('Transmute Magic Item', 'The Armorer additional replicated item must remain in the Armor category.');
      return;
    }
    onUpdateInventory?.(next);
    spendResource(MAGIC_ITEM_TINKER_TRANSMUTE_RESOURCE);
    onNotice?.('Transmute Magic Item', `Transformed the item into ${selectedTarget.label}.`);
    setTransmuteSource('');
    setTransmuteTarget('');
  };

  const sourceOptions = replicated.map((item) => ({
    value: String(item.craftedFrom || ''),
    label: itemDisplayName(item),
  }));

  return (
    <Stack spacing={0.75} onClick={(event) => event.stopPropagation()}>
      <Box sx={sectionSx}>
        <Typography sx={labelSx}>Charge Magic Item · Bonus Action</Typography>
        <Typography sx={{ fontSize: FONT_SIZES.xs, color: 'text.secondary', mb: 0.5 }}>
          Spend a level 1+ spell slot; the replicated item regains charges equal to the slot level.
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <SelectField
            value={chargeSource}
            onChange={setChargeSource}
            emptyOption={{ label: 'Select charged item…' }}
            options={chargeable.map((item) => ({
              value: item.craftedFrom,
              label: `${itemDisplayName(item)} (${itemChargeCurrent(item)}/${itemChargeMaximum(item)})`,
            }))}
            fullWidth={false}
            sx={selectSx}
          />
          <SelectField
            value={chargeLevel}
            onChange={setChargeLevel}
            emptyOption={{ label: 'Slot level…' }}
            options={slotOptions.map(({ key, source, level, available }) => ({
              value: key,
              label: `Level ${level} · ${source === 'pact' ? 'Pact Magic' : 'Regular'} (${available})`,
            }))}
            fullWidth={false}
            sx={{ ...selectSx, minWidth: 115, flex: '0 1 135px' }}
          />
        </Stack>
        {selectedChargeItem ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5 }}>
            <Button size="small" variant="outlined" onClick={() => updateCharges(-1)} disabled={readOnly || itemChargeCurrent(selectedChargeItem) <= 0}>− Charge</Button>
            <Button size="small" variant="outlined" onClick={() => updateCharges(1)} disabled={readOnly || itemChargeCurrent(selectedChargeItem) >= itemChargeMaximum(selectedChargeItem)}>+ Charge</Button>
            <Button size="small" variant="contained" onClick={chargeItem} disabled={readOnly || !selectedSlot || itemChargeCurrent(selectedChargeItem) >= itemChargeMaximum(selectedChargeItem)}>Spend Slot</Button>
          </Stack>
        ) : null}
      </Box>

      <Box sx={sectionSx}>
        <Typography sx={labelSx}>Drain Magic Item · Bonus Action · {drainUses}/1</Typography>
        <Typography sx={{ fontSize: FONT_SIZES.xs, color: 'text.secondary', mb: 0.5 }}>
          Destroy a Common item for a level 1 slot, or an Uncommon/Rare item for a level 2 slot. Once per Long Rest.
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <SelectField
            value={drainSource}
            onChange={setDrainSource}
            emptyOption={{ label: 'Select replicated item…' }}
            options={drainable.map((item) => ({ value: item.craftedFrom, label: `${itemDisplayName(item)} · ${rarityLabel(item)}` }))}
            fullWidth={false}
            sx={selectSx}
          />
          <Button variant="contained" size="small" onClick={drainItem} disabled={readOnly || !selectedDrainItem || drainUses <= 0}>Drain</Button>
        </Stack>
      </Box>

      <Box sx={sectionSx}>
        <Typography sx={labelSx}>Transmute Magic Item · Magic Action · {transmuteUses}/1</Typography>
        <Typography sx={{ fontSize: FONT_SIZES.xs, color: 'text.secondary', mb: 0.5 }}>
          Transform one replicated item into a different item based on another plan you know. Once per Long Rest.
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <SelectField
            value={transmuteSource}
            onChange={(value) => { setTransmuteSource(value); setTransmuteTarget(''); }}
            emptyOption={{ label: 'Transform item…' }}
            options={sourceOptions}
            fullWidth={false}
            sx={selectSx}
          />
          <SelectField
            value={transmuteTarget}
            onChange={setTransmuteTarget}
            emptyOption={{ label: 'Into known plan…' }}
            options={targetOptions.map((option) => ({ value: option.plan, label: option.label }))}
            fullWidth={false}
            sx={selectSx}
          />
          <Button variant="contained" size="small" onClick={transmuteItem} disabled={readOnly || !transmuteSource || !selectedTarget || transmuteUses <= 0}>Transmute</Button>
        </Stack>
      </Box>
    </Stack>
  );
}
