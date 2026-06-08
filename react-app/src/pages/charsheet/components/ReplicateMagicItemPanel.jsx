import { useEffect, useMemo, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Minus, Plus } from 'lucide-react';
import { loadItems } from '../../charbuilder/logic/dataLoaders.js';
import { ItemNameIcon } from '../../../shared/character/FiveEToolsLink.jsx';
import { ExpandableCard } from '../../../shared/character/ExpandableCard.jsx';
import { ItemReferenceBody } from '../../../shared/character/ItemReference.jsx';
import {
  addReplicatedItem,
  removeOneReplicated,
  replicatedCount,
  replicatedCountFor,
} from '../../../shared/character/replicatedItems.js';

// Exact normalised key (order-preserving) — primary, collision-free match.
function exactKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Order-independent key so "Shield +1" matches a DB "+1 Shield". Used only as a
// fallback when no exact match exists, since sorting can rarely alias names.
function looseKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join('');
}

function resolveDetail(action, character, sheet) {
  const raw = action?.detail;
  if (typeof raw !== 'function') return raw || {};
  try {
    return raw({ action, character, sheet }) || {};
  } catch {
    return {};
  }
}

const stepBtnSx = (disabled) => ({
  width: 22,
  height: 22,
  border: 1,
  borderColor: 'divider',
  borderRadius: '3px',
  color: 'text.secondary',
  opacity: disabled ? 0.35 : 1,
  '&:hover': disabled ? {} : { borderColor: '#caa550', color: '#caa550' },
});

export default function ReplicateMagicItemPanel({ action, character, sheet, onUpdateInventory }) {
  const [itemsDb, setItemsDb] = useState([]);
  const detail = useMemo(() => resolveDetail(action, character, sheet), [action, character, sheet]);
  const plans = Array.isArray(detail.plans) ? detail.plans : [];
  const maxActive = Math.max(0, Number(detail.maxActive || 0));
  const inv = sheet?.sheetInventory || [];

  useEffect(() => {
    let alive = true;
    loadItems().then((items) => { if (alive) setItemsDb(items || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const { exactMap, looseMap } = useMemo(() => {
    const exact = new Map();
    const loose = new Map();
    (itemsDb || []).forEach((item) => {
      const ek = exactKey(item?.name);
      const lk = looseKey(item?.name);
      if (ek && !exact.has(ek)) exact.set(ek, item);
      if (lk && !loose.has(lk)) loose.set(lk, item);
    });
    return { exactMap: exact, looseMap: loose };
  }, [itemsDb]);

  const resolveItem = (plan) => exactMap.get(exactKey(plan)) || looseMap.get(looseKey(plan)) || null;

  const total = replicatedCount(inv);
  const remaining = Math.max(0, maxActive - total);

  const handleAdd = (plan) => {
    if (remaining <= 0 || !onUpdateInventory) return;
    const dbItem = resolveItem(plan);
    const itemData = dbItem ? { ...dbItem } : { name: plan };
    itemData.name = plan; // keep the plan's wording as the inventory label
    onUpdateInventory(addReplicatedItem(inv, itemData, plan, maxActive));
  };

  const handleRemove = (plan) => {
    if (!onUpdateInventory) return;
    if (replicatedCountFor(inv, plan) <= 0) return;
    onUpdateInventory(removeOneReplicated(inv, plan));
  };

  if (!plans.length) {
    return (
      <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
        <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', fontStyle: 'italic' }}>
          No plans chosen yet — pick them in the character builder.
        </Typography>
      </Box>
    );
  }

  return (
    <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.6 }}>
        <Typography sx={headerSx}>Replicated Items</Typography>
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.62rem', fontWeight: 700, color: remaining > 0 ? '#edd48a' : '#de675f' }}>
          {total} / {maxActive} active
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {plans.map((plan) => {
          const count = replicatedCountFor(inv, plan);
          const dbItem = resolveItem(plan);
          const addDisabled = remaining <= 0;
          const removeDisabled = count <= 0;
          const stepper = (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
              <IconButton size="small" aria-label={`Remove ${plan}`} disabled={removeDisabled} onClick={() => handleRemove(plan)} sx={stepBtnSx(removeDisabled)}>
                <Minus size={13} />
              </IconButton>
              <Box sx={{ minWidth: 16, textAlign: 'center', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, fontSize: '0.78rem', color: '#edd48a' }}>{count}</Box>
              <IconButton size="small" aria-label={`Add ${plan}`} disabled={addDisabled} onClick={() => handleAdd(plan)} sx={stepBtnSx(addDisabled)}>
                <Plus size={13} />
              </IconButton>
            </Box>
          );
          const rowBorder = count > 0 ? 'rgba(202,165,80,0.4)' : 'divider';
          const rowBg = count > 0 ? 'rgba(202,165,80,0.06)' : 'rgba(35,32,26,1)';

          if (!dbItem) {
            return (
              <Box key={plan} sx={{ display: 'flex', alignItems: 'center', gap: '7px', px: '8px', py: '5px', border: 1, borderColor: rowBorder, borderRadius: 1, bgcolor: rowBg }}>
                <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.8rem', color: 'text.primary' }}>{plan}</Typography>
                {stepper}
              </Box>
            );
          }

          return (
            <ExpandableCard
              key={plan}
              containerSx={{ border: 1, borderColor: rowBorder, borderRadius: 1, bgcolor: rowBg, overflow: 'hidden' }}
              detailsSx={{ px: '10px', pt: '2px', pb: '8px', bgcolor: '#12100e', fontSize: '0.7rem', color: 'text.secondary' }}
              details={<ItemReferenceBody item={dbItem} />}
              summary={({ toggle }) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px', px: '8px', py: '5px' }}>
                  <Box onClick={toggle} sx={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0, cursor: 'pointer' }}>
                    <ItemNameIcon item={dbItem} />
                    <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.8rem', color: 'text.primary' }}>{plan}</Typography>
                  </Box>
                  {stepper}
                </Box>
              )}
            />
          );
        })}
      </Box>

      {remaining <= 0 ? (
        <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', fontStyle: 'italic', mt: 0.5 }}>
          Active limit reached. Remove one to replicate another.
        </Typography>
      ) : null}
    </Box>
  );
}

const panelSx = {
  mt: 0.8,
  p: 1,
  bgcolor: 'rgba(237,212,138,0.04)',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
};

const headerSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.66rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#edd48a',
};
