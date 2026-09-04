import { createAdapterBindings } from './adapterBindings.js';

export function installSpellDataAdapter(registry, context, name, data = {}) {
  const { registerSpellData } = createAdapterBindings(registry, context);
  registerSpellData(name, {
    toHit: false,
    hasSave: Boolean(data.saveAbility),
    heal: false,
    ...data,
  });
}
