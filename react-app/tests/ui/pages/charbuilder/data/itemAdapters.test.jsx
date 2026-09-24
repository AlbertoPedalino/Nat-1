import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { expect, test, vi } from 'vitest';
import * as adapterRuntime from '../../../../../src/adapters/index.js';
import { adaptBuilderData } from '../../../../../src/adapters/adapterPipeline.js';
import { loadItems, reconcileInventoryWithItemsDb } from '../../../../../src/pages/charbuilder/data/dataLoaders.js';
import SpellsTab from '../../../../../src/pages/charsheet/spells/SpellsTab.jsx';
import { SheetActionsProvider } from '../../../../../src/pages/charsheet/state/SheetActionsContext.jsx';
import { ProficiencySetsProvider } from '../../../../../src/pages/charsheet/proficiency/ProficiencySetsContext.jsx';
import { theme } from '../../../../../src/app/theme.js';

test('item adapters enrich the shared catalog before reconciliation and produce spell descriptions without duplicate builder application', async () => {
  const item = { name: 'Adapter Test Ring', source: 'XDMG', type: 'RG', reqAttune: true };
  const requests = [];
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    requests.push(url);
    const data = url.endsWith('/items.json') ? { item: [item] }
      : url.endsWith('/spells-xphb.json') ? { spell: [{
        name: 'Levitate', source: 'XPHB', level: 2, entries: ['The adapter-granted spell description.'],
      }] } : {};
    return { ok: true, json: async () => data };
  }));
  // Emulate a per-item installer becoming available only after its chunk loads.
  const originalLoad = adapterRuntime.loadItemAdapters;
  const enrich = vi.fn((record) => record.name === item.name && record.source === item.source
    ? { ...record, attachedSpells: [...(record.attachedSpells || []), 'levitate|xphb'] }
    : record);
  vi.spyOn(adapterRuntime, 'loadItemAdapters')
    .mockRejectedValueOnce(new Error('Missing adapter chunk'))
    .mockImplementationOnce(async (context) => {
      const registry = await originalLoad(context);
      registry.registerGlobalItemAdapter(enrich);
      return registry;
    });

  try {
    // A missing adapter must not produce a cacheable, incomplete item catalog.
    await expect(loadItems()).rejects.toThrow('Missing adapter chunk');
    const items = await loadItems();
    expect(items[0].attachedSpells).toEqual(['levitate|xphb']);
    expect(enrich).toHaveBeenCalledOnce();
    expect(item.attachedSpells).toBeUndefined();

    const builder = adaptBuilderData({ items }, adapterRuntime.adapterRegistry, { items, itemsAlreadyAdapted: true });
    expect(builder.items[0].attachedSpells).toEqual(['levitate|xphb']);
    expect(enrich).toHaveBeenCalledOnce();

    const stored = { ...item, attachedSpells: null, attuned: true, equipped: true, qty: 2, chargesUsed: 1 };
    const inventory = reconcileInventoryWithItemsDb([stored], items);
    expect(inventory[0]).toMatchObject({ ...stored, attachedSpells: ['levitate|xphb'] });

    const reloadedItems = await loadItems();
    const refreshed = reconcileInventoryWithItemsDb(inventory, reloadedItems);
    expect(refreshed[0].attachedSpells).toEqual(['levitate|xphb']);
    expect(requests).toHaveLength(3); // Raw JSON is still shared across callers.

    const view = (attuned) => {
      const character = { className: 'Fighter', level: 1, inventory: [{ ...refreshed[0], attuned }] };
      return (
        <ThemeProvider theme={theme}>
          <SheetActionsProvider value={{}}>
            <ProficiencySetsProvider character={character}>
              <SpellsTab C={character} sheet={{}} />
            </ProficiencySetsProvider>
          </SheetActionsProvider>
        </ThemeProvider>
      );
    };
    const { rerender } = render(view(true));
    fireEvent.click(await screen.findByText('Levitate', { exact: true }));
    expect(await screen.findByText('The adapter-granted spell description.')).toBeVisible();
    rerender(view(false));
    expect(screen.queryByText('Levitate', { exact: true })).not.toBeInTheDocument();
  } finally {
    vi.unstubAllGlobals();
  }
});
