import { backgroundRemovalPatch, sceneBackgrounds } from '../../vtt/scene/scene.js';
import { updateScene } from './vttScenes.js';
import { deleteMapImage, uploadMapImage } from './vttMapImages.js';

// The battlemap is one picture you replace; backgrounds are a list you add to
// (addSceneBackground / removeSceneBackground). A file is deleted only once no
// column of the row points at it any more: a legacy scene may reference the
// same object as both its battlemap and a background.

// Replacing the battlemap is one operation to callers: persist the fresh path,
// then remove the path the row no longer references.
export async function replaceSceneImage(scene, file) {
  const previous = scene?.imagePath || null;
  let uploadedPath = null;
  let updated = null;
  try {
    uploadedPath = await uploadMapImage(scene?.campaignId, scene?.id, file);
    updated = await updateScene(scene?.id, { imagePath: uploadedPath, shownImage: 'map' });
  } catch (cause) {
    // If the row never took ownership of this upload, do not leave it behind.
    if (uploadedPath) {
      try { await deleteMapImage(uploadedPath); } catch {}
    }
    throw cause;
  }

  let cleanupError = null;
  if (previous && previous !== uploadedPath && !sceneBackgrounds(scene).includes(previous)) {
    try {
      await deleteMapImage(previous);
    } catch (cause) {
      cleanupError = cause;
    }
  }
  return { scene: updated, cleanupError };
}

// Clear the database reference before deleting its bytes.
export async function removeSceneImage(scene) {
  const previous = scene?.imagePath || null;
  if (!previous) return { scene: scene || null, cleanupError: null };
  const backgrounds = sceneBackgrounds(scene);
  const shownImage = scene?.shownImage === 'map' && backgrounds.length ? 'background' : scene?.shownImage;
  const updated = await updateScene(scene?.id, { imagePath: null, shownImage });
  let cleanupError = null;
  if (!backgrounds.includes(previous)) {
    try {
      await deleteMapImage(previous);
    } catch (cause) {
      cleanupError = cause;
    }
  }
  return { scene: updated, cleanupError };
}

// A new background joins the end of the list. With `show` it also becomes the
// published picture; without it (the GM is preparing behind a frozen
// presentation) the table stays where it is.
export async function addSceneBackground(scene, file, { show = true } = {}) {
  let uploadedPath = null;
  try {
    uploadedPath = await uploadMapImage(scene?.campaignId, scene?.id, file);
    const backgrounds = [...sceneBackgrounds(scene), uploadedPath];
    const patch = show
      ? { backgrounds, backgroundPath: uploadedPath, shownImage: 'background' }
      // A scene with no background yet still needs one named as its own.
      : { backgrounds, ...(scene?.backgroundPath ? {} : { backgroundPath: uploadedPath }) };
    const updated = await updateScene(scene?.id, patch);
    return { scene: updated, path: uploadedPath };
  } catch (cause) {
    if (uploadedPath) {
      try { await deleteMapImage(uploadedPath); } catch {}
    }
    throw cause;
  }
}

export async function removeSceneBackground(scene, path) {
  const patch = backgroundRemovalPatch(scene, path);
  if (!patch) return { scene: scene || null, cleanupError: null };
  const updated = await updateScene(scene?.id, patch);
  let cleanupError = null;
  if (path !== scene?.imagePath) {
    try {
      await deleteMapImage(path);
    } catch (cause) {
      cleanupError = cause;
    }
  }
  return { scene: updated, cleanupError };
}
