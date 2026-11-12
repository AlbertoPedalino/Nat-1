import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { getMod, getFinal } from '../../../shared/character/sheet/sheetStats.js';
import { getAllResourceDefs } from '../../../shared/character/resources/restResources.js';
import { resolveActionFormulas, collectAdapterActions } from '../../../shared/character/sheet/adapterActions.js';
import { makeWildShapeActions } from '../../../shared/character/forms/wildShapeActions.js';
import { FILTERS, SECTION_DEFS, buildActionTags } from './actionTags.js';
import { normalizeResourceMax } from '../../../shared/character/resources/restResources.js';
import { makeWeaponActions } from './weaponActions.js';
import { loadVariantRules } from '../../../shared/content/catalogs/rulesData.js';
import { levelHeaderSx, panelRootSx, panelToolbarSx } from '../spells/spellsTabStyles.js';
import SearchField from '../../../shared/ui/SearchField.jsx';
import SlotDialogs from './SlotDialogs.jsx';
import { useResourceSideEffects } from './useResourceSideEffects.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { signed } from '../../../shared/ui/numberFormat.js';
import { capitalize } from '../../../shared/ui/textCase.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES, FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { matchesQuery } from '../../../shared/content/searchText.js';
import { classNames } from '../../../shared/character/progression/classLevel.js';
import { AdapterActionCard } from './AdapterActionCard.jsx';
import { ensureClassAdapters } from '../../../shared/character/sheet/sheetRuntimeAdapters.js';
import { useItemsDb } from '../inventory/useItemsDb.js';
import { useLoaded } from '../../../shared/ui/useLoaded.js';
import { useMasteryEntries } from '../../../shared/character/combat/WeaponMasteryBlock.jsx';
import { sectionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import FilterToggles from '../../../shared/ui/FilterToggles.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { LIST_ROW_RULE_SX } from '../../../shared/ui/interactive.js';
import { isWeaponItem } from '../../../shared/character/inventory/itemKinds.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';

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

const FILTER_OPTIONS = FILTERS.map((key) => ({ key, label: actionLabel(key) }));
const NO_RULES = [];

export default function ActionsTab({ C, sheet, resources }) {
  const {
    onRoll, setResources, onShowToast, onNotice, onUpdateSheet, onUpdateCharacter,
  } = useSheetActions();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const itemsDb = useItemsDb();
  const variantRules = useLoaded(loadVariantRules, [], { initial: NO_RULES }).data;
  // Mastery descriptions: the cards redraw once they are in.
  useMasteryEntries();
  const ownedClassNames = classNames(C);
  const classNamesKey = ownedClassNames.join('|');

  useEffect(() => {
    // Best-effort: a stale chunk leaves the cards it would add out, it does not
    // throw an unhandled rejection.
    ensureClassAdapters(ownedClassNames);
  }, [classNamesKey]);

  const inv = sheet?.sheetInventory || [];
  const attacks = inv.filter((item) => item.equipped && isWeaponItem(item));
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
   .map(buildActionTags);
  const showAttacks = false;
  const matchesSearch = (action) => matchesQuery(search, action.name, action.desc);
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
    C, sheet, resources, setResources, onNotice, onUpdateSheet, onUpdateCharacter, resMaxMap, resNameMap,
  });

  return (
    <Box sx={panelRootSx}>
      <Box sx={panelToolbarSx}>
        <FilterToggles options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
        <SearchField
          placeholder="Search actions..."
          value={search}
          onChange={setSearch}
          density="compact"
          sx={{ flex: 1, minWidth: 140 }}
        />
      </Box>

      {showAttacks && (
        <Box sx={{ overflow: 'auto' }}>
          <Typography sx={levelHeaderSx}>Attacks</Typography>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT_SIZES.lg }}>
            <Box component="thead">
              <Box component="tr" sx={{ '& th': { ...sectionLabelSx, color: 'text.secondary', ...LIST_ROW_RULE_SX, p: '4px 6px', textAlign: 'left' } }}>
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
                  <Box component="tr" key={i} sx={{ '& td': { p: '6px 6px', ...LIST_ROW_RULE_SX, color: 'text.secondary' }, '&:hover td': { bgcolor: UI_COLORS.surfaceHeader } }}>
                    <Box component="td"><Typography sx={{ color: 'text.primary', fontWeight: FONT_WEIGHTS.bold }}>{item.name}</Typography></Box>
                    <Box component="td"><Typography sx={{ ...TEXT_STYLES.figure, color: UI_COLORS.accentText, fontSize: FONT_SIZES.xxl }}>{hitBonus}</Typography></Box>
                    <Box component="td"><Typography sx={{ fontFamily: UI_FONTS.display, color: 'text.primary' }}>{item.damage?.[0]?.damage || '—'}</Typography></Box>
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
          <Box sx={{ display: 'grid', gap: 0.5, minWidth: 0 }}>
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
                onNotice={onNotice}
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

      {!actionSections.length ? <EmptyLine framed>No actions for this filter.</EmptyLine> : null}

      <SlotDialogs dialogs={slotDialogs} resNameMap={resNameMap} />
    </Box>
  );
}

