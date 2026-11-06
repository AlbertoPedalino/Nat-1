import { requireClient } from '../supabaseClient.js';
import {
  mapImageCampaignFolder,
  mapImageFolder,
  mapImagePath,
} from '../../vtt/scene/scene.js';
import { getStorageJson, setStorageJson, removeStorageItem } from '../../storage/storage.js';

// The battle map's pictures in Storage: uploads under
// map-images/<campaign>/<scene>/, signed URLs to show them, and the cleanup
// Postgres cannot cascade into a different service.

const MAP_BUCKET = 'map-images';
// Long enough to cover a session. The URL is the cache key in the browser, so a
// short life meant a fresh signature — and a fresh download of the same
// megabytes — on every reload.
const SIGNED_URL_TTL = 8 * 60 * 60;
// Re-signed a little early, so a link never expires in the middle of a scene.
const SIGNED_URL_MARGIN_MS = 15 * 60 * 1000;
const SIGNED_URL_KEY = 'gb:vtt:signed-url:';

export async function uploadMapImage(campaignId, sceneId, file) {
  const supabase = requireClient();
  const path = mapImagePath(campaignId, sceneId, file?.name);
  if (!path) throw new Error('Missing campaign or scene for this map image.');

  const { error } = await supabase.storage
    .from(MAP_BUCKET)
    // A path is never reused — every upload mints a new one — so the bytes at a
    // given address never change and can be cached for as long as the browser
    // likes.
    .upload(path, file, { cacheControl: '2592000', upsert: false });
  if (error) throw error;
  return path;
}

// The bucket is private, so the editor renders through a signed URL. Callers
// keep the path and never the URL — but the URL is remembered here, because the
// browser caches an image by its address: signing afresh on every mount produced
// a new address for the same bytes and downloaded a whole battlemap again on
// each reload.
function readCachedUrl(path) {
  const entry = getStorageJson(SIGNED_URL_KEY + path);
  return entry?.url && entry.expiresAt - SIGNED_URL_MARGIN_MS > Date.now() ? entry.url : null;
}

function writeCachedUrl(path, url, expiresIn) {
  // A full or denied storage only costs the caching, not the picture.
  setStorageJson(SIGNED_URL_KEY + path, { url, expiresAt: Date.now() + expiresIn * 1000 });
}

export async function signMapImage(path, expiresIn = SIGNED_URL_TTL) {
  if (!path) return null;
  const cached = readCachedUrl(path);
  if (cached) return cached;

  const supabase = requireClient();
  const { data, error } = await supabase.storage.from(MAP_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  const url = data?.signedUrl || null;
  if (url) writeCachedUrl(path, url, expiresIn);
  return url;
}

function forgetSignedMapUrl(path) {
  removeStorageItem(SIGNED_URL_KEY + path);
}

export async function deleteMapImages(paths) {
  const unique = [...new Set((paths || []).filter(Boolean))];
  if (!unique.length) return;
  const supabase = requireClient();
  const bucket = supabase.storage.from(MAP_BUCKET);
  // Keep requests modest: Storage accepts arrays, but a scene can have many
  // handouts and no single oversized cleanup request should fail them all.
  for (let index = 0; index < unique.length; index += 100) {
    const batch = unique.slice(index, index + 100);
    const { error } = await bucket.remove(batch);
    if (error) throw error;
    batch.forEach(forgetSignedMapUrl);
  }
}

export async function deleteMapImage(path) {
  await deleteMapImages(path ? [path] : []);
}

export async function deleteSceneMapImages(campaignId, sceneId) {
  const folder = mapImageFolder(campaignId, sceneId);
  if (!folder) throw new Error('Missing campaign or scene for image cleanup.');

  const supabase = requireClient();
  const bucket = supabase.storage.from(MAP_BUCKET);
  const paths = [];
  const limit = 100;
  let offset = 0;
  while (true) {
    const { data, error } = await bucket.list(folder, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    const entries = data || [];
    // Files have an id/metadata; folders do not. Uploads made by this app are
    // direct children, so never recurse into an unexpected path.
    paths.push(...entries
      .filter((entry) => entry?.name && (entry.id || entry.metadata))
      .map((entry) => `${folder}/${entry.name}`));
    if (entries.length < limit) break;
    offset += entries.length;
  }
  await deleteMapImages(paths);
}

// Campaign deletion cascades through Postgres but not through Storage. Walk
// every scene folder while the campaign still exists and the GM still satisfies
// the bucket policies, including folders orphaned by older versions of the app.
export async function deleteCampaignMapImages(campaignId) {
  const folder = mapImageCampaignFolder(campaignId);
  if (!folder) throw new Error('Missing campaign for image cleanup.');

  const supabase = requireClient();
  const bucket = supabase.storage.from(MAP_BUCKET);
  const entries = [];
  const limit = 100;
  let offset = 0;
  while (true) {
    const { data, error } = await bucket.list(folder, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    const page = data || [];
    entries.push(...page);
    if (page.length < limit) break;
    offset += page.length;
  }

  const directFiles = entries
    .filter((entry) => entry?.name && (entry.id || entry.metadata))
    .map((entry) => `${folder}/${entry.name}`);
  const sceneFolders = entries
    .filter((entry) => entry?.name && !(entry.id || entry.metadata))
    .map((entry) => entry.name);

  await deleteMapImages(directFiles);
  for (const sceneId of sceneFolders) {
    await deleteSceneMapImages(folder, sceneId);
  }
}
