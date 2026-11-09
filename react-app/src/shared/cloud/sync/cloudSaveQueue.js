import { createKeyedQueue } from './keyed.js';

// How long an edited character waits before it goes to the cloud: the
// builder, the sheet and the background sync all use this one pause.
export const CLOUD_SAVE_DELAY_MS = 1_200;

// At most one builder cloud save in flight. `enqueue()` asks for a save of the
// builder's current state: if one is already running, it waits behind it, and
// every further request made while it waits is the same save (it reads the
// latest state when it starts, so it covers them all). A save therefore always
// starts from what the previous one produced — the row it created, the
// sheet_revision it returned — instead of racing it with the same expected
// revision or a second INSERT. Resolves with the save's result; a failed save
// does not stop the next one, which decides for itself whether to run.
export function createCloudSaveQueue(save) {
  const queue = createKeyedQueue();
  let waiting = null;
  return function enqueue() {
    if (waiting) return waiting;
    waiting = queue.run('save', () => {
      waiting = null;
      return save();
    });
    return waiting;
  };
}
