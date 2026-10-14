// How a GM window and the projector it opened find each other again.
//
// The window handle `window.open` returns is the direct line, but it is lost
// whenever the GM page reloads, and a named `window.open` is not guaranteed to
// land on the window already open. So the two also talk over a BroadcastChannel
// — same browser, same origin, nothing sent to the server — keyed by the
// presenter's camera source, which the GM tab keeps for its whole session:
//
//   who    presenter -> projector   "is my projector open?"
//   here   projector -> presenter   on arrival, and in answer to `who`
//   gone   projector -> presenter   the projector page is going away
//   close  presenter -> projector   Stop projector mode
//
// A projector on another device is out of reach of all of this and is simply
// never reported as attached: it keeps following the camera through Realtime.

const CHANNEL_NAME = 'gmboard-projector';

// A handle whose window was closed, or that the browser no longer lets us read.
export function isWindowOpen(handle) {
  try {
    return Boolean(handle) && handle.closed === false;
  } catch (_) {
    return false;
  }
}

// `handlers` maps a message type to a callback; only messages for `source` are
// delivered. Returns null where there is no BroadcastChannel, and the callers
// fall back to the window handle alone.
export function createProjectorLink(source, handlers = {}, Channel = globalThis.BroadcastChannel) {
  if (!source || typeof Channel !== 'function') return null;
  let channel;
  try {
    channel = new Channel(CHANNEL_NAME);
  } catch (_) {
    return null;
  }
  channel.onmessage = (event) => {
    const message = event?.data;
    if (!message || message.source !== source) return;
    if (Object.prototype.hasOwnProperty.call(handlers, message.type)) handlers[message.type]();
  };
  return {
    send(type) {
      try { channel.postMessage({ type, source }); } catch (_) {}
    },
    close() {
      try { channel.close(); } catch (_) {}
    },
  };
}
