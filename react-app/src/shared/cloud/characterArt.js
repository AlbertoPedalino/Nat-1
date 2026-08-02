import { requireClient, supabase } from './supabaseClient.js';
import { currentUser } from './cloudCharacters.js';
import {
  PORTRAIT_SIZE,
  forgetPortrait,
  isSupportedPortrait,
  portraitPath,
  readPortrait,
  writePortrait,
} from '../character/portrait.js';

// A character's portrait, from the file the player picked to the picture every
// screen shows.
//
// Two decisions carry the whole module. The picture is cut down to a small
// square before it ever leaves the browser, so what is stored, sent and cached
// is a handful of kilobytes rather than whatever came off a phone. And what is
// kept locally is the picture itself, not a link to it: after the first load a
// sheet, a battle map and an encounter all draw the same portrait with no
// network at all, which is the point of keeping it.

const PORTRAIT_BUCKET = 'character-art';
// The bucket is private, so a portrait that is not already in hand is fetched
// through a signed link. The link is used once, to get the bytes — it is never
// what an <img> points at, so it has no reason to be long-lived or remembered.
const SIGNED_URL_TTL = 60;

// Cropped to a square from the middle, which is where a face is, and scaled to
// the size the largest thing that shows one needs.
async function downscale(file) {
  const source = await createImageBitmap(file);
  try {
    const side = Math.min(source.width, source.height);
    const canvas = document.createElement('canvas');
    canvas.width = PORTRAIT_SIZE;
    canvas.height = PORTRAIT_SIZE;

    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      source,
      (source.width - side) / 2,
      (source.height - side) / 2,
      side,
      side,
      0,
      0,
      PORTRAIT_SIZE,
      PORTRAIT_SIZE,
    );

    const url = canvas.toDataURL('image/webp', 0.86);
    const blob = await (await fetch(url)).blob();
    return { blob, url };
  } finally {
    source.close?.();
  }
}

export async function uploadPortrait(characterId, file) {
  if (!isSupportedPortrait(file)) throw new Error('Pick an image file under 12 MB.');
  const client = requireClient();
  const user = await currentUser();

  const { blob, url } = await downscale(file);
  const path = portraitPath(user.id, characterId);
  if (!path) throw new Error('Missing character for this portrait.');

  const { error } = await client.storage
    .from(PORTRAIT_BUCKET)
    // The address is new every time, so the bytes at it never change and can be
    // cached for as long as anything likes.
    .upload(path, blob, { cacheControl: '2592000', contentType: 'image/webp', upsert: false });
  if (error) throw error;

  // The uploader already has the picture in hand; there is no sense in
  // downloading back what was just sent.
  writePortrait(path, url);
  return path;
}

// The picture at this path, from the local copy if there is one.
//
// Returns a data URL rather than a link: the bytes are then held by the page
// itself, and the same portrait shown in four places is fetched once ever
// rather than once per address per session.
export async function loadPortrait(path) {
  if (!path) return null;
  const cached = readPortrait(path);
  if (cached) return cached;
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(PORTRAIT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;

  const response = await fetch(data.signedUrl);
  if (!response.ok) return null;
  const url = await toDataUrl(await response.blob());
  if (url) writePortrait(path, url);
  return url;
}

export async function deletePortrait(path) {
  forgetPortrait(path);
  if (!path || !supabase) return;
  // A portrait nobody points at is a few kilobytes; failing to remove it must
  // not stop the sheet from forgetting it.
  try {
    await supabase.storage.from(PORTRAIT_BUCKET).remove([path]);
  } catch {}
}

function toDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
