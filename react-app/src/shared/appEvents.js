// In-tab window events the app sends between unrelated parts of the page.
// Character health and sheet signals live in cloud/sync/characterEvents.js,
// the sync state in cloud/sync/cloudSyncState.js.

// A character was saved to / deleted from this browser's store
// (detail: { id }). Cloud autosync follows them.
export const CHARACTER_SAVED_EVENT = 'gb:char-saved';
export const CHARACTER_DELETED_EVENT = 'gb:char-deleted';

// Tool instances were linked or unlinked (detail, when sent by the store:
// { sectionKey, id, linkGroupId }).
export const INSTANCE_LINKS_CHANGED_EVENT = 'gb:instance-links-changed';

// A campaign's GM Board changed: readers of the board's tables refresh.
export const CAMPAIGN_BOARD_LINK_CHANGED_EVENT = 'gb:campaign-board-link-changed';
