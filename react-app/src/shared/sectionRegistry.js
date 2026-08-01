function section(config) {
  return Object.freeze({ ...config });
}

// Lightweight section identity shared by storage, pickers, and autosync.
// Keep page storage implementations out of this module so the app entry can
// subscribe to events without pulling route-only code into the eager bundle.
export const SECTION_REGISTRY = Object.freeze({
  gmboard: section({
    key: 'gmboard',
    table: 'boards',
    registryKey: 'gb_board_registry',
    activeKey: 'gb_active_board_id',
    saveEvent: 'gb:board-saved',
    deleteEvent: 'gb:board-deleted',
    scopedPrefix: (id) => `gb:board:${id}:`,
    label: 'GM Board',
    route: (id) => `/gmboard?board=${encodeURIComponent(id)}`,
    newRoute: '/gmboard?board=new',
    defaultName: (id) => `GM Board ${id}`,
  }),
  encounters: section({
    key: 'encounters',
    table: 'encounters',
    registryKey: 'gb_encounter_registry',
    activeKey: 'gb_active_encounter_id',
    saveEvent: 'gb:encounter-saved',
    deleteEvent: 'gb:encounter-deleted',
    scopedPrefix: (id) => `gb:enc:${id}:`,
    label: 'Encounter',
    route: (id) => `/encounter-builder?enc=${encodeURIComponent(id)}`,
    newRoute: '/encounter-builder?enc=new',
    defaultName: (id) => `Encounter ${id}`,
  }),
  dmscreen: section({
    key: 'dmscreen',
    table: 'dm_screens',
    registryKey: 'gb_dmscreen_registry',
    activeKey: 'gb_active_dmscreen_id',
    saveEvent: 'gb:dmscreen-saved',
    deleteEvent: 'gb:dmscreen-deleted',
    scopedPrefix: (id) => `gb:dmscreen:${id}:`,
    label: 'DM Screen',
    route: (id) => `/dm-screen?screen=${encodeURIComponent(id)}`,
    newRoute: '/dm-screen?screen=new',
    defaultName: (id) => `DM Screen ${id}`,
  }),
});

export const SECTION_KEYS = Object.freeze(Object.keys(SECTION_REGISTRY));
