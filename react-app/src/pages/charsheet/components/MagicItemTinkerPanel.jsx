import { useEffect, useMemo, useState } from 'react';
import { Box, Button, MenuItem, Select, Stack, Typography } from '@mui/material';
import { loadItems } from '../../charbuilder/logic/dataLoaders.js';
import { getSheetSlots } from '../logic/spellsTabLogic.js';
import { useSheetActions } from '../context/SheetActionsContext.jsx';
import {
  consumePactSlot,
  consumeSlot,
  getAvailablePactSlots,
  getRegularSlotUsed,
} from '../../../shared/character/spellSlots.js';
import { classLevel } from '../../../shared/character/classLevel.js';
import { removeOneCrafted } from '../../../shared/character/craftedItemState.js';
import {
  itemChargeCurrent,
  itemChargeMaximum,
} from '../../../shared/character/itemCharges.js';
import {
  collectReplicatePlanChoices,
  hasImprovedArmorer,
  replicateChoiceLabel,
  resolveReplicateChoice,
} from '../../../shared/character/replicateMagicItem.js';
import {
  MAGIC_ITEM_TINKER_DRAIN_RESOURCE,
  MAGIC_ITEM_TINKER_TRANSMUTE_RESOURCE,
  drainSpellSlotLevel,
  isReplicatedItem,
  rechargeReplicatedItem,
  replaceReplicatedItem,
  replicatedNonArmorCount,
  setReplicatedItemCharges,
} from '../../../shared/character/magicItemTinker.js';

const sectionSx = {
  p: 0.8,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(35,32,26,1)',
};
const labelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.62rem',
  fontWeight: 700,
  color: '#edd48a',
  letterSpacing: '0.06em',
};
const selectSx = {
  flex: 1,
  minWidth: 150,
  fontSize: '0.72rem',
  '& .MuiSelect-select': { py: 0.65 },
};

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
    onShowToast,
    setResources,
    readOnly,
  } = useSheetActions();
  const [itemsDb, setItemsDb] = useState([]);
  const [chargeSource, setChargeSource] = useState('');
  const [chargeLevel, setChargeLevel] = useState('');
  const [drainSource, setDrainSource] = useState('');
  const [transmuteSource, setTransmuteSource] = useState('');
  const [transmuteTarget, setTransmuteTarget] = useState('');

  useEffect(() => {
    let alive = true;
    loadItems().then((items) => { if (alive) setItemsDb(items || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

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

  const sheetSlots = useMemo(() => getSheetSlots(character), [character]);
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
    onShowToast?.('Charge Magic Item', `${selectedChargeItem.displayName || selectedChargeItem.name} regained up to ${level} charges using a level ${level} ${sourceLabel}.`, null, []);
  };

  const drainItem = () => {
    if (!selectedDrainItem || drainUses <= 0 || readOnly) return;
    const level = drainSpellSlotLevel(selectedDrainItem);
    if (!level) return;
    const created = { ...(sheet?.createdSpellSlots || {}) };
    created[level] = Number(created[level] || 0) + 1;
    onUpdateSheet?.({ createdSpellSlots: created });
    onUpdateCharacter?.((prev) => ({ ...prev, createdSpellSlots: created }));
    onUpdateInventory?.(removeOneCrafted(inventory, 'replicated', drainSource));
    spendResource(MAGIC_ITEM_TINKER_DRAIN_RESOURCE);
    onShowToast?.('Drain Magic Item', `${selectedDrainItem.displayName || selectedDrainItem.name} vanished; created a level ${level} spell slot.`, null, []);
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
      onShowToast?.('Transmute Magic Item', 'The Armorer additional replicated item must remain in the Armor category.', null, []);
      return;
    }
    onUpdateInventory?.(next);
    spendResource(MAGIC_ITEM_TINKER_TRANSMUTE_RESOURCE);
    onShowToast?.('Transmute Magic Item', `Transformed the item into ${selectedTarget.label}.`, null, []);
    setTransmuteSource('');
    setTransmuteTarget('');
  };

  const sourceOptions = replicated.map((item) => ({
    value: String(item.craftedFrom || ''),
    label: item.displayName || item.name,
  }));

  return (
    <Stack spacing={0.7} onClick={(event) => event.stopPropagation()}>
      <Box sx={sectionSx}>
        <Typography sx={labelSx}>Charge Magic Item · Bonus Action</Typography>
        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', mb: 0.55 }}>
          Spend a level 1+ spell slot; the replicated item regains charges equal to the slot level.
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
          <Select size="small" displayEmpty value={chargeSource} onChange={(event) => setChargeSource(event.target.value)} sx={selectSx}>
            <MenuItem value=""><em>Select charged item…</em></MenuItem>
            {chargeable.map((item) => (
              <MenuItem key={item.craftedFrom} value={item.craftedFrom}>
                {item.displayName || item.name} ({itemChargeCurrent(item)}/{itemChargeMaximum(item)})
              </MenuItem>
            ))}
          </Select>
          <Select size="small" displayEmpty value={chargeLevel} onChange={(event) => setChargeLevel(event.target.value)} sx={{ ...selectSx, minWidth: 115, flex: '0 1 135px' }}>
            <MenuItem value=""><em>Slot level…</em></MenuItem>
            {slotOptions.map(({ key, source, level, available }) => (
              <MenuItem key={key} value={key}>
                Level {level} · {source === 'pact' ? 'Pact Magic' : 'Regular'} ({available})
              </MenuItem>
            ))}
          </Select>
        </Stack>
        {selectedChargeItem ? (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
            <Button size="small" variant="outlined" onClick={() => updateCharges(-1)} disabled={readOnly || itemChargeCurrent(selectedChargeItem) <= 0}>− Charge</Button>
            <Button size="small" variant="outlined" onClick={() => updateCharges(1)} disabled={readOnly || itemChargeCurrent(selectedChargeItem) >= itemChargeMaximum(selectedChargeItem)}>+ Charge</Button>
            <Button size="small" variant="contained" onClick={chargeItem} disabled={readOnly || !selectedSlot || itemChargeCurrent(selectedChargeItem) >= itemChargeMaximum(selectedChargeItem)}>Spend Slot</Button>
          </Stack>
        ) : null}
      </Box>

      <Box sx={sectionSx}>
        <Typography sx={labelSx}>Drain Magic Item · Bonus Action · {drainUses}/1</Typography>
        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', mb: 0.55 }}>
          Destroy a Common item for a level 1 slot, or an Uncommon/Rare item for a level 2 slot. Once per Long Rest.
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Select size="small" displayEmpty value={drainSource} onChange={(event) => setDrainSource(event.target.value)} sx={selectSx}>
            <MenuItem value=""><em>Select replicated item…</em></MenuItem>
            {drainable.map((item) => <MenuItem key={item.craftedFrom} value={item.craftedFrom}>{item.displayName || item.name} · {item.rarity}</MenuItem>)}
          </Select>
          <Button variant="contained" size="small" onClick={drainItem} disabled={readOnly || !selectedDrainItem || drainUses <= 0}>Drain</Button>
        </Stack>
      </Box>

      <Box sx={sectionSx}>
        <Typography sx={labelSx}>Transmute Magic Item · Magic Action · {transmuteUses}/1</Typography>
        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', mb: 0.55 }}>
          Transform one replicated item into a different item based on another plan you know. Once per Long Rest.
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
          <Select size="small" displayEmpty value={transmuteSource} onChange={(event) => { setTransmuteSource(event.target.value); setTransmuteTarget(''); }} sx={selectSx}>
            <MenuItem value=""><em>Transform item…</em></MenuItem>
            {sourceOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </Select>
          <Select size="small" displayEmpty value={transmuteTarget} onChange={(event) => setTransmuteTarget(event.target.value)} sx={selectSx}>
            <MenuItem value=""><em>Into known plan…</em></MenuItem>
            {targetOptions.map((option) => <MenuItem key={option.plan} value={option.plan}>{option.label}</MenuItem>)}
          </Select>
          <Button variant="contained" size="small" onClick={transmuteItem} disabled={readOnly || !transmuteSource || !selectedTarget || transmuteUses <= 0}>Transmute</Button>
        </Stack>
      </Box>
    </Stack>
  );
}
