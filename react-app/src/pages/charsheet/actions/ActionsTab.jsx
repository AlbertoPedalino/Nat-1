import { useEffect, useState } from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { getMod, getFinal } from '../state/calculations.js';
import { describeAttackRoll } from '../../../shared/character/combat/conditions.js';
import { loadCoreAdapters, loadClassAdapters } from '../../../adapters/index.js';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { getChoiceValue } from '../../../shared/character/progression/choiceUtils.js';
import { getAllResourceDefs } from '../resources/restResources.js';
import { toggleActiveField } from '../state/toggleState.js';
import {
  FILTERS,
  CAT_COLORS,
  SECTION_DEFS,
  normalizeResourceMax,
  resolveActionFormulas,
  collectAdapterActions,
  makeWildShapeActions,
  getActionRollers,
  buildActionTags,
} from './actionsTabLogic.js';
import { makeWeaponActions } from './weaponActions.js';
import { loadItems, loadVariantRules } from '../../charbuilder/data/dataLoaders.js';
import { loadMasteryEntries } from '../../../shared/character/combat/weaponMastery.js';
import { WeaponMasteryBlock } from '../../../shared/character/combat/WeaponMasteryBlock.jsx';
import { WeaponNoteBlock } from '../../../shared/character/combat/WeaponNoteBlock.jsx';
import {
  compactInputSx,
  filterChipSx,
  inlineButtonSx,
  levelHeaderSx,
  panelRootSx,
  panelToolbarSx,
  spellBodySx,
  spellRowSx,
} from '../spells/spellsTabStyles.js';
import { Empty } from '../spells/SpellsUiParts.jsx';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { ACTION_DETAIL_RENDERERS } from './actionDetailRenderers.js';
import SlotDialogs from './SlotDialogs.jsx';
import { useResourceSideEffects } from './useResourceSideEffects.js';
import AttackRollButton from './AttackRollButton.jsx';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import ResourceBar from '../resources/ResourceBar.jsx';
import { RichInline, RichText } from '../../../shared/content/RichText.jsx';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import CollapsibleNote from '../../../shared/ui/CollapsibleNote.jsx';
import PipButton from '../../../shared/ui/PipButton.jsx';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { ItemPropertyTable } from '../../../shared/character/inventory/ItemPropertyTable.jsx';
import { formatRollTitle } from '../../../shared/character/dice/dice.js';
import RollerButtons from '../../../shared/character/dice/RollerButtons.jsx';
import { CHIP_TONES, chipToneStyle } from '../../../shared/ui/entityColors.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { capitalize } from '../../../shared/ui/textCase.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';

const _danglingResKeyWarned = typeof Set === 'function' ? new Set() : null;
function warnDanglingResKey(action, resMaxMap) {
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return;
  if (!_danglingResKeyWarned || !action?.resKey || resMaxMap[action.resKey] != null) return;
  const cacheKey = `${action._source || action.ownerName || ''}|${action.name}|${action.resKey}`;
  if (_danglingResKeyWarned.has(cacheKey)) return;
  _danglingResKeyWarned.add(cacheKey);
  // eslint-disable-next-line no-console
  console.warn(`[actions] Action "${action.name}" references resKey "${action.resKey}" with no matching resource def (${action._source || action.ownerName || '?'}).`);
}

function actionLabel(value) {
  if (value === 'all') return 'All';
  if (value === 'bonus') return 'Bonus Action';
  if (value === 'special') return 'Other';
  return capitalize(value);
}

export default function ActionsTab({ C, sheet, resources }) {
  const { onRoll, setResources, onShowToast, onUpdateSheet, onUpdateCharacter } = useSheetActions();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [itemsDb, setItemsDb] = useState([]);
  const [variantRules, setVariantRules] = useState([]);
  const [, setMasteriesLoaded] = useState(false);
  const classNames = [C?.className, ...(C?.extraClasses || []).map((e) => e.name)].filter(Boolean);
  const classNamesKey = classNames.join('|');

  useEffect(() => {
    Promise.all([
      loadCoreAdapters(),
      loadClassAdapters(classNames, { getMod, getFinal }),
    ]);
  }, [classNamesKey]);

  useEffect(() => {
    let alive = true;
    loadItems()
      .then((items) => { if (alive) setItemsDb(items || []); })
      .catch(() => { if (alive) setItemsDb([]); });
    loadVariantRules()
      .then((rules) => { if (alive) setVariantRules(rules || []); })
      .catch(() => { if (alive) setVariantRules([]); });
    loadMasteryEntries()
      .then(() => { if (alive) setMasteriesLoaded(true); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const inv = sheet?.sheetInventory || [];
  const attacks = inv.filter(i => i.equipped && ['M', 'R'].includes(String(i.type || '').toUpperCase()));
  const masteryItems = itemsDb.length ? itemsDb : inv;
  const profSets = useProficiencySets();
  const unarmedStrikeEntries = variantRules.find((rule) => (
    rule.name === 'Unarmed Strike' && rule.source === 'XPHB'
  ))?.entries || null;
  const adapterActions = [
    ...makeWeaponActions(C, attacks, inv, masteryItems, profSets, {
      unarmedStrike: unarmedStrikeEntries,
    }),
    ...collectAdapterActions(C, sheet),
    ...makeWildShapeActions(C),
  ].map((action) => resolveActionFormulas(action, C))
   .map((action) => buildActionTags(action, C));
  const showAttacks = false;
  const q = search.trim().toLowerCase();
  const matchesSearch = (action) => {
    if (!q) return true;
    return String(action.name || '').toLowerCase().includes(q)
      || String(action.desc || '').toLowerCase().includes(q);
  };
  const actionSections = SECTION_DEFS
    .filter(section => filter === 'all' || filter === section.key)
    .map(section => ({
      ...section,
      actions: adapterActions.filter(action => {
        const inPrimary = section.cats.includes(action.cat);
        // A card whose panel hosts other action types (e.g. Eldritch Cannon's
        // bonus-action firing + reaction Detonate) surfaces under those filters
        // too, but only when that filter is active so it isn't duplicated in All.
        // Entries may be a bare section key or { key, minLevel } to gate a type
        // that unlocks later (Detonate is a Reaction only from level 9). An
        // optional _alsoFiltersCondition(C, sheet) gates the whole card by
        // runtime state (Eldritch Cannon only hosts bonus/reaction while active).
        const extraAllowed = filter !== 'all'
          && (typeof action._alsoFiltersCondition !== 'function' || action._alsoFiltersCondition(C, sheet));
        const inExtra = extraAllowed && (action._alsoFilters || []).some((f) => {
          const key = typeof f === 'string' ? f : f.key;
          if (key !== section.key) return false;
          const min = typeof f === 'string' ? 0 : Number(f.minLevel || 0);
          return Number(action.ownerLevel || 0) >= min;
        });
        return (inPrimary || inExtra) && matchesSearch(action);
      }),
    }))
    .filter(section => section.actions.length > 0);

  const resMaxMap = {};
  const resNameMap = {};
  const resPoolMap = {};
  const resTrackMap = {};
  const resGroupMap = {};
  getAllResourceDefs(C).forEach(def => {
    if (!def.key) return;
    resMaxMap[def.key] = normalizeResourceMax(def, C);
    resNameMap[def.key] = def.name || def.key;
    resTrackMap[def.key] = def.track || 'remaining';
    if (def.pool) resPoolMap[def.key] = true;
    // Resources that group their consuming actions under one label (e.g. Channel
    // Divinity) prefix each option's card name "<group>: <option>"; the generic
    // holder card is dropped from the adapter data (its rules stay in Features).
    if (def.actionGroup) resGroupMap[def.key] = def.actionGroup;
  });

  const actionDisplayName = (action) => {
    const group = resGroupMap[action.resKey];
    if (!group) return action.name;
    return String(action.name || '').startsWith(group) ? action.name : `${group}: ${action.name}`;
  };
  adapterActions.forEach((a) => warnDanglingResKey(a, resMaxMap));

  const { handleResChange, dialogs: slotDialogs } = useResourceSideEffects({
    C, sheet, resources, setResources, onShowToast, onUpdateSheet, onUpdateCharacter, resMaxMap, resNameMap,
  });

  return (
    <Box sx={panelRootSx}>
      <Box sx={panelToolbarSx}>
        {FILTERS.map(f => (
          <Chip
            key={f}
            size="small"
            label={actionLabel(f)}
            variant={filter === f ? 'filled' : 'outlined'}
            color={filter === f ? 'primary' : 'default'}
            onClick={() => setFilter(f)}
            sx={filterChipSx}
          />
        ))}
        <SearchField
          placeholder="Search actions..."
          value={search}
          onChange={setSearch}
          iconSize={14}
          sx={{ ...compactInputSx, flex: 1, minWidth: 140 }}
        />
      </Box>

      {showAttacks && (
        <Box sx={{ overflow: 'auto' }}>
          <Typography sx={levelHeaderSx}>Attacks</Typography>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <Box component="thead">
              <Box component="tr" sx={{ '& th': { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: 1, borderColor: 'divider', p: '4px 6px', textAlign: 'left' } }}>
                <Box component="th">Name</Box>
                <Box component="th">Hit</Box>
                <Box component="th">Damage</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {attacks.map((item, i) => {
                const prof = getMod(getFinal(C, 'str')) > getMod(getFinal(C, 'dex')) ? getMod(getFinal(C, 'str')) : getMod(getFinal(C, 'dex'));
                const hitBonus = signed(prof);
                return (
                  <Box component="tr" key={i} sx={{ '& td': { p: '6px 6px', borderBottom: 1, borderColor: 'divider', color: 'text.secondary' }, '&:hover td': { bgcolor: UI_COLORS.headerBg } }}>
                    <Box component="td"><Typography sx={{ color: 'text.primary', fontWeight: 600 }}>{item.name}</Typography></Box>
                    <Box component="td"><Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, color: UI_COLORS.goldLight, fontSize: '0.875rem' }}>{hitBonus}</Typography></Box>
                    <Box component="td"><Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', color: 'text.primary' }}>{item.damage?.[0]?.damage || '—'}</Typography></Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      {actionSections.map(section => (
        <Box key={section.key} sx={{ minWidth: 0 }}>
          <Typography sx={{ ...levelHeaderSx, color: 'primary.main' }}>
            {section.title}
          </Typography>
          <Box sx={{ display: 'grid', gap: '4px', minWidth: 0 }}>
            {section.actions.map((action, i) => (
              <AdapterActionCard
                key={`${section.key}-${i}`}
                C={C}
                sheet={sheet}
                action={action}
                resources={resources}
                onResChange={handleResChange}
                onRoll={onRoll}
                onShowToast={onShowToast}
                resMax={resMaxMap[action.resKey]}
                isPool={resPoolMap[action.resKey]}
                resTrack={resTrackMap[action.resKey]}
                displayName={actionDisplayName(action)}
                colorBarCat={section.cats.includes(action.cat)
                  ? (action._colorBarCat || action.cat)
                  : section.key}
              />
            ))}
          </Box>
        </Box>
      ))}

      {!actionSections.length ? <Empty text="No actions for this filter." /> : null}

      <SlotDialogs dialogs={slotDialogs} resNameMap={resNameMap} />
    </Box>
  );
}

function AdapterActionCard({ C, sheet, action, resources, onResChange, onRoll, onShowToast, resMax, isPool, resTrack, colorBarCat, displayName }) {
  const barCat = colorBarCat || action._colorBarCat || action.cat;
  const { onUpdateCharacter } = useSheetActions();
  const DetailRenderer = action.detailType ? ACTION_DETAIL_RENDERERS[action.detailType] : null;
  const hasRes = action.resKey && resources && resources[action.resKey] != null;
  const resCur = hasRes ? (resources[action.resKey] ?? 0) : 0;
  const safeMax = resMax === Infinity ? Infinity : Math.max(0, Number(resMax ?? 1) || 1);
  const hasEntries = Array.isArray(action.entries) ? action.entries.length > 0 : Boolean(action.entries);
  const hasDescription = Boolean(String(action.desc || '').trim());
  // Interactive card = its expanded body carries its own controls (a DetailRenderer
  // panel or an inline choice picker); its description is tucked into a collapsible
  // disclosure so the controls stay the focus. Plain cards show the description inline.
  const cardInteractive = Boolean(DetailRenderer) || Boolean(action.choiceKey && onUpdateCharacter);
  const descriptionNode = (hasEntries || hasDescription)
    ? (hasEntries ? <EntryBlocks entries={action.entries} emptyText="" /> : <RichText text={action.desc} />)
    : null;
  const hasActionDetails = Boolean(
    action._item
    || hasEntries
    || hasDescription
    || (action.choiceKey && onUpdateCharacter)
    || action._weaponMastery
    || action._weaponNotes?.length
    || DetailRenderer
  );
  const hasStatusRow = Boolean(action._toggleKey && onUpdateCharacter);
  const hasPersistentRows = hasStatusRow || hasRes;
  const persistentRowSx = (bgcolor, isLast, open) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    px: '10px',
    py: '5px',
    border: 1,
    borderTop: 'none',
    borderColor: 'divider',
    borderRadius: isLast && !open ? '0 0 8px 8px' : 0,
    bgcolor,
  });

  const rollers = getActionRollers(action);
  const hasRollers = Number.isFinite(action.attackBonus) || rollers.length > 0;

  // Attack-roll advantage/disadvantage from active conditions, combined with
  // the weapon-level disadvantage (heavy/untrained).
  const activeConditions = sheet?.activeConditions || [];
  const attackRoll = describeAttackRoll(activeConditions, {
    extraDisadv: !!action._disadvantage,
  });

  return (
    <ExpandableCard
      containerSx={{ overflow: 'hidden' }}
      disabled={!hasActionDetails}
      summary={({ toggle, disabled, open }) => (
          <Box onClick={disabled ? undefined : toggle} sx={{ ...spellRowSx, mb: 0, py: '7px', borderRadius: open || hasPersistentRows ? '8px 8px 0 0' : 1, cursor: disabled ? 'default' : 'pointer' }}>
            {barCat && CAT_COLORS[barCat] && (
              <Box sx={{ width: 6, height: 28, borderRadius: 1, bgcolor: CAT_COLORS[barCat], flexShrink: 0, opacity: 0.95 }} />
            )}

            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <Typography sx={{ flex: 1, fontSize: '0.78rem', fontWeight: 700, color: 'text.primary', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName || action.name}
                </Typography>
                {hasRollers ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
                    {Number.isFinite(action.attackBonus) ? (
                      <AttackRollButton
                        rawBonus={action.attackBonus}
                        exhaustionLevel={sheet?.exhaustionLevel}
                        label={formatRollTitle(action.name, 'Attack')}
                        advArg={attackRoll.advArg}
                        sources={attackRoll.sources}
                        tag={attackRoll.tag}
                        tooltip={attackRoll.tooltip}
                        disadv={attackRoll.disadv}
                        notProficient={!!action._notProficient}
                        onRoll={onRoll}
                      />
                    ) : null}
                    <RollerButtons
                      rollers={rollers}
                      subject={action.rollLabelPrefix || action.name}
                      onShowToast={onShowToast}
                      buttonSx={inlineButtonSx}
                    />
                  </Box>
                ) : null}
              </Box>
              {(action.tags || []).length ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexWrap: 'wrap' }}>
                  {action.tags.map((tag) => (
                    <MiniBadge key={tag.key} label={tag.label} color={tag.color} bg={tag.bg} />
                  ))}
                </Box>
              ) : null}
            </Box>
          </Box>
      )}
      persistent={({ open }) => (
        <>
      {hasStatusRow ? (() => {
        const toggleCtx = { C, action, hasRes, resCur };
        const toggleField = toggleActiveField(action._toggleKey);
        const isActive = C?.[toggleField] === true;
        const toggleInfo = typeof action._toggleCondition === 'function'
          ? action._toggleCondition(toggleCtx) : {};
        const canToggleOn = !isActive && hasRes && resCur > 0
          && toggleInfo.canActivate !== false;
        const isSuppressed = isActive && toggleInfo.isSuppressed;
        const label = isSuppressed ? 'Suppressed' : (isActive ? 'Active' : 'Inactive');
        const statusTone = isSuppressed ? CHIP_TONES.negative : (isActive ? CHIP_TONES.positive : CHIP_TONES.info);
        const statusStyle = chipToneStyle(statusTone);
        return (
        <Box sx={persistentRowSx(uiAlpha(UI_COLORS.blueSoft, 0.06), !hasRes, open)}>
          <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif', mr: 0.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Status</Typography>
          <Chip
            size="small"
            label={label}
            variant="outlined"
            onClick={() => {
              if (isActive) {
                onUpdateCharacter(prev => ({ ...prev, [toggleField]: false }));
              } else if (canToggleOn) {
                onUpdateCharacter(prev => ({ ...prev, [toggleField]: true }));
                onResChange?.(action.resKey, -1);
              }
            }}
            sx={{
              cursor: isActive || canToggleOn ? 'pointer' : 'not-allowed',
              fontSize: '0.58rem',
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: 700,
              letterSpacing: '0.06em',
              ...statusStyle,
              '&:hover': { borderColor: (isActive || canToggleOn) ? statusTone : statusStyle.borderColor },
            }}
          />
        </Box>
        );
      })() : null}

      {hasRes ? (
        <Box sx={persistentRowSx(uiAlpha(UI_COLORS.gold, 0.06), true, open)}>
          <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif', mr: 0.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{resTrack === 'used' ? 'Spent' : 'Uses'}</Typography>
          {safeMax === Infinity ? (
            typeof onResChange === 'function' ? (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => { e.stopPropagation(); onResChange(action.resKey, -1); }}
                sx={{ fontSize: '0.6rem', fontFamily: '"Cinzel", Georgia, serif', letterSpacing: '0.06em', minWidth: 0, py: 0.2, px: 0.6, color: UI_COLORS.goldLight, borderColor: uiAlpha(UI_COLORS.goldLight, 0.35), '&:hover': { borderColor: UI_COLORS.goldLight, bgcolor: uiAlpha(UI_COLORS.goldLight, 0.08) } }}
              >{action.buttonLabel || (action.controller ? 'Open' : 'Use')}</Button>
            ) : (
              <Typography sx={{ fontSize: '0.7rem', color: UI_COLORS.goldLight, fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700 }}>∞</Typography>
            )
          ) : (isPool || safeMax > 10) ? (
            <ResourceBar value={resCur} max={safeMax} onChange={(delta) => onResChange(action.resKey, delta)} />
          ) : (
            Array.from({ length: safeMax }, (_, i) => {
              const available = i >= safeMax - resCur;
              return (
                <PipButton
                  key={i}
                  size={10}
                  round
                  title={available ? 'Available' : 'Used'}
                  aria-label={`${action.name}: ${available ? 'spend use' : 'recover use'}`}
                  onClick={(e) => { e.stopPropagation(); onResChange(action.resKey, available ? -1 : 1); }}
                  sx={{
                    border: '1.5px solid',
                    bgcolor: available ? 'transparent' : UI_COLORS.goldLight,
                    borderColor: available ? uiAlpha(UI_COLORS.gold, 0.35) : UI_COLORS.goldLight,
                  }}
                />
              );
            })
          )}
        </Box>
      ) : null}
        </>
      )}
      detailsSx={{ ...spellBodySx, mt: 0, mb: 0 }}
      details={hasActionDetails ? (
        <>
          {action._item ? <ItemPropertyTable item={action._item} sx={{ mb: '6px' }} /> : null}
          {descriptionNode
            ? (cardInteractive ? <CollapsibleNote>{descriptionNode}</CollapsibleNote> : descriptionNode)
            : null}
          {action.choiceKey && onUpdateCharacter ? (
            <ChoicePicker action={action} C={C} onUpdateCharacter={onUpdateCharacter} onShowToast={onShowToast} />
          ) : null}
          <WeaponMasteryBlock mastery={action._weaponMastery} />
          {action._itemProperty ? <WeaponNoteBlock notes={[action._itemProperty]} /> : null}
          <WeaponNoteBlock notes={action._weaponNotes} />
          {DetailRenderer ? (
            <DetailRenderer
              action={action}
              character={C}
              sheet={sheet}
              resources={resources}
              onResChange={onResChange}
              resMax={resMax}
            />
          ) : null}
        </>
      ) : null}
    />
  );
}

const _CHOICE_PICKER_OPTIONS = {
  armorer_model: [
    { value: 'Guardian', label: 'Guardian (Defensive Tank)' },
    { value: 'Infiltrator', label: 'Infiltrator (Fast Striker)' },
    { value: 'Dreadnaught', label: 'Dreadnought (Force + Reach)' },
  ],
};

function ChoicePicker({ action, C, onUpdateCharacter, onShowToast }) {
  const choiceKey = action.choiceKey;
  const options = action.choiceOptions || _CHOICE_PICKER_OPTIONS[choiceKey];
  if (!options || !options.length) return null;
  const current = getChoiceValue(C, choiceKey);
  const q = String(current || '').toLowerCase();
  const match = options.find((o) => String(o.value).toLowerCase() === q);
  const activeValue = match ? match.value : '';

  const handleChange = (_, next) => {
    if (next === activeValue) return;
    // Exclusive ToggleButtonGroup yields null when the active button is clicked
    // again: clear the choice when the action opts in, otherwise ignore.
    if (!next) {
      if (!action.choiceAllowClear) return;
      onUpdateCharacter((prev) => {
        const choices = { ...(prev.choices || {}) };
        delete choices[choiceKey];
        return { ...prev, choices };
      });
      if (!action.choiceNoToast) onShowToast?.('Choice Cleared', `${action.choiceLabel || 'Choice'} cleared`, 0, []);
      return;
    }
    onUpdateCharacter((prev) => {
      const choices = { ...(prev.choices || {}) };
      choices[choiceKey] = next;
      return { ...prev, choices };
    });
    if (!action.choiceNoToast) onShowToast?.('Choice Updated', `${action.choiceLabel || 'Choice'}: ${next}`, 0, []);
  };

  return (
    <Box sx={{ mt: 0.7, pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: '0.6rem', color: UI_COLORS.goldLight, fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, letterSpacing: '0.08em', mb: 0.3 }}>
        {action.choiceLabel || 'Active Option'}
      </Typography>
      <ToggleButtonGroup size="small" exclusive value={activeValue} onChange={handleChange}
        sx={{ flexWrap: 'wrap', gap: '3px', '& .MuiToggleButton-root': { fontSize: '0.65rem', px: '8px', py: '3px', border: 1, borderColor: 'divider', borderRadius: '999px !important', color: 'text.secondary', bgcolor: 'transparent', '&.Mui-selected': { bgcolor: uiAlpha(UI_COLORS.gold, 0.14), color: UI_COLORS.goldLight, borderColor: UI_COLORS.gold } } }}
      >
        {options.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Typography component="div" sx={{ fontSize: '0.55rem', color: 'text.secondary', mt: 0.2, fontStyle: 'italic' }}>
        <RichInline text={action.choiceRestNote || "Change when you finish a Short or Long Rest (Smith's Tools required)."} keyPrefix={`choice-${action.choiceKey || 'note'}`} />
      </Typography>
    </Box>
  );
}
