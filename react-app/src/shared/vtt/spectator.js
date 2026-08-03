import { normalizeCameraSource } from './cameraSync.js';
import { isTokenInPlay } from './scene.js';

export function spectatorRoute(search) {
  const params = new URLSearchParams(search || '');
  const requested = params.has('spectator');
  return {
    requested,
    source: requested ? normalizeCameraSource(params.get('spectator')) : null,
  };
}

export function spectatorUrl(currentHref, campaignId, cameraSource) {
  const url = new URL(currentHref);
  url.search = '';
  url.searchParams.set('campaign', campaignId);
  url.searchParams.set('spectator', cameraSource);
  return url.toString();
}

export function projectPlayerTokens(tokens, playArea) {
  return (tokens || [])
    .filter((token) => token?.layer !== 'gm' && isTokenInPlay(token, playArea))
    .map(({ secretLabel: _secretLabel, ...token }) => token);
}

export function shouldApplyPresenterFrame(wasFollowing, nextFollowing) {
  return Boolean(wasFollowing || nextFollowing);
}
