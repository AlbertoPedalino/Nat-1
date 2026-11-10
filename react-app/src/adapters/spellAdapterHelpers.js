import { createAdapterBindings } from './adapterBindings.js';

export function installSpellDataAdapter(registry, context, name, data = {}) {
  const { registerSpellData } = createAdapterBindings(registry, context);
  registerSpellData(name, { heal: false, ...data });
}
