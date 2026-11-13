import { adapterRegistry, installAdapters } from './registry.js';
import { asArray } from '../shared/lists.js';
import { cachedLoaderByKey } from '../shared/content/cachedLoader.js';

const adapterModules = import.meta.glob('./{classes,feats,species,spells,items}/**/*.js');
const loadedPaths = new Set();
// Each adapter module imported once; a failed import is tried again.
const importAdapterModule = cachedLoaderByKey((path) => adapterModules[path]());
const installedAdapters = [];
const speciesPathPattern = /^\.\/species\//;
const featPathPattern = /^\.\/feats\//;
const itemPathPattern = /^\.\/items\//;
const runtimeConfigPathPattern = /\/runtime-config\.js$/;

function classFolderToken(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// A class skin's adapters live with its base class (registry.js,
// registerClassSkin): both folders load.
function pathsForClass(name) {
  const tokens = [...new Set([name, adapterRegistry.getRuleClassName(name)].map(classFolderToken))];
  return Object.keys(adapterModules).filter((path) => tokens.some((token) => (
    path.includes(`./classes/${token}/`) || path.includes(`/classes/${token}/`)
  )));
}

function pathsForSpecies() {
  return Object.keys(adapterModules).filter((path) => speciesPathPattern.test(path));
}

function pathsForFeats() {
  return Object.keys(adapterModules).filter((path) => featPathPattern.test(path));
}

function pathsForItems() {
  return Object.keys(adapterModules).filter((path) => itemPathPattern.test(path));
}

function pathsForCoreRuntime() {
  return Object.keys(adapterModules).filter((path) => runtimeConfigPathPattern.test(path));
}

async function loadPaths(paths, context) {
  const uniquePaths = [...new Set(paths)];
  const entries = [];
  uniquePaths.forEach((path) => {
    if (loadedPaths.has(path)) return;
    entries.push({ path, promise: importAdapterModule(path) });
  });
  if (!entries.length) return [];
  const modules = await Promise.all(entries.map((entry) => entry.promise));
  const triggeredPaths = [];
  const toInstall = [];
  entries.forEach((entry, idx) => {
    if (loadedPaths.has(entry.path)) return;
    loadedPaths.add(entry.path);
    triggeredPaths.push(entry.path);
    const adapter = modules[idx]?.default;
    if (adapter) {
      installedAdapters.push(adapter);
      toInstall.push(adapter);
    }
  });
  if (toInstall.length) {
    installAdapters(toInstall, adapterRegistry, context);
  }
  return triggeredPaths;
}

export async function loadItemAdapters(context = {}) {
  await loadPaths(pathsForItems(), context);
  return adapterRegistry;
}

export async function loadCoreAdapters(context = {}) {
  await Promise.all([
    loadPaths(pathsForSpecies(), context),
    loadPaths(pathsForFeats(), context),
    loadItemAdapters(context),
    loadPaths(pathsForCoreRuntime(), context),
  ]);
  return adapterRegistry;
}

export async function loadClassAdapters(classNames, context = {}) {
  const names = asArray(classNames).filter(Boolean);
  const requestedClasses = [...new Set(names)];
  const classByPath = new Map();
  const allPaths = [];
  requestedClasses.forEach((name) => {
    pathsForClass(name).forEach((path) => {
      if (!classByPath.has(path)) classByPath.set(path, name);
      allPaths.push(path);
    });
  });
  const triggeredPaths = await loadPaths(allPaths, context);
  const loadedClassesSet = new Set();
  triggeredPaths.forEach((path) => {
    const cls = classByPath.get(path);
    if (cls) loadedClassesSet.add(cls);
  });
  const loadedClasses = [...loadedClassesSet];
  return {
    loadedNewAdapters: loadedClasses.length > 0,
    loadedClasses,
    requestedClasses,
  };
}

export async function loadSpellsAdapters(context = {}) {
  const spellsPaths = Object.keys(adapterModules).filter((path) => path.startsWith('./spells'));
  await loadPaths(spellsPaths, context);
  return adapterRegistry;
}

export { adapterRegistry };
