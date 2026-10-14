import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectorLink, isWindowOpen } from '../../../../../src/shared/vtt/session/projectorLink.js';

// A BroadcastChannel as the browser gives it: every other open channel of the
// same name receives a message, the sender does not.
function fakeChannels() {
  const open = new Set();
  return class FakeChannel {
    constructor(name) { this.name = name; this.onmessage = null; open.add(this); }
    postMessage(data) {
      for (const other of open) {
        if (other !== this && other.name === this.name) other.onmessage?.({ data });
      }
    }
    close() { open.delete(this); }
  };
}

test('a GM window finds the projector it opened, and can ask it to close', () => {
  const Channel = fakeChannels();
  const seen = [];
  let projector = null;
  projector = createProjectorLink('cam-a', {
    who: () => projector.send('here'),
    close: () => seen.push('projector closes'),
  }, Channel);
  const presenter = createProjectorLink('cam-a', { here: () => seen.push('attached') }, Channel);

  presenter.send('who');
  assert.deepEqual(seen, ['attached']);
  presenter.send('close');
  assert.deepEqual(seen, ['attached', 'projector closes']);
});

test('another GM tab does not hear this tab\'s projector', () => {
  const Channel = fakeChannels();
  const seen = [];
  let projector = null;
  projector = createProjectorLink('cam-a', { who: () => projector.send('here') }, Channel);
  const other = createProjectorLink('cam-b', { here: () => seen.push('wrong tab attached') }, Channel);

  other.send('who');
  projector.send('here');
  assert.deepEqual(seen, []);
});

test('a closed link is silent, and unknown or malformed messages are ignored', () => {
  const Channel = fakeChannels();
  const seen = [];
  const presenter = createProjectorLink('cam-a', { here: () => seen.push('here') }, Channel);
  const projector = createProjectorLink('cam-a', {}, Channel);
  const raw = new Channel('gmboard-projector');

  raw.postMessage(null);
  raw.postMessage({ type: 'here' });
  raw.postMessage({ type: 'toString', source: 'cam-a' });
  assert.deepEqual(seen, []);

  projector.send('here');
  assert.deepEqual(seen, ['here']);
  presenter.close();
  projector.send('here');
  assert.deepEqual(seen, ['here']);
});

test('without a source or a BroadcastChannel there is no link', () => {
  assert.equal(createProjectorLink('', {}, fakeChannels()), null);
  // null, not undefined: undefined would fall back to the real global channel.
  assert.equal(createProjectorLink('cam-a', {}, null), null);
  assert.equal(createProjectorLink('cam-a', {}, class { constructor() { throw new Error('blocked'); } }), null);
});

test('a window handle counts as open only while the browser says so', () => {
  assert.equal(isWindowOpen({ closed: false }), true);
  assert.equal(isWindowOpen({ closed: true }), false);
  assert.equal(isWindowOpen(null), false);
  assert.equal(isWindowOpen({}), false);
  assert.equal(isWindowOpen(Object.defineProperty({}, 'closed', { get() { throw new Error('cross-origin'); } })), false);
});
