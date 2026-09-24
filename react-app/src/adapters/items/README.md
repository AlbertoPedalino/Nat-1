# Item adapters

Use one `.js` file per item. Files here are discovered automatically; export an
installer that registers the item's behavior. Match both item name and source.

For spells missing from the source JSON, register a global item adapter and
return a new record with `attachedSpells` (using `spell name|source` references).
Keep the adapter idempotent and preserve the record's other fields. The spell
source must exist in the supported spell catalog or the character's snapshots.

`loadItems()` waits for these installers and applies their data adapters before
returning the catalog to the builder, sheet, inventory, and crafting panels.
Sheet reconciliation copies the enriched `attachedSpells` onto existing inventory
items while preserving attunement, equipment state, quantity, and usage state.
Custom inventory items are excluded from catalog reconciliation.

The Spells tab derives cards from active inventory items and resolves their
descriptions by spell name and source. Do not duplicate spell descriptions in
the item adapter. Additional item-specific casting mechanics may need their own
runtime support; adding `attachedSpells` supplies the spell references.
