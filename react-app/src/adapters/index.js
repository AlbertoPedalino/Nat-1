import { adapterRegistry, installAdapters } from './registry.js';

const adapterModules = import.meta.glob('./{classes,feats,species,spells,items}/**/*.js');
const loadedPaths = new Set();
const inFlightPathPromises = new Map();
const installedAdapters = [];
const speciesPathPattern = /^\.\/species\//;
const featPathPattern = /^\.\/feats\//;
const itemPathPattern = /^\.\/items\//;
const runtimeConfigPathPattern = /\/runtime-config\.js$/;

function classFolderToken(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
}

function pathsForClass(name) {
  const token = classFolderToken(name);
  return Object.keys(adapterModules).filter((path) =>
    path.includes(`./classes/${token}/`) || path.includes(`/classes/${token}/`),
  );
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
    let promise = inFlightPathPromises.get(path);
    if (!promise) {
      promise = adapterModules[path]();
      inFlightPathPromises.set(path, promise);
    }
    entries.push({ path, promise });
  });
  if (!entries.length) return [];
  const modules = await Promise.all(entries.map((entry) => entry.promise));
  const triggeredPaths = [];
  const toInstall = [];
  entries.forEach((entry, idx) => {
    if (loadedPaths.has(entry.path)) return;
    loadedPaths.add(entry.path);
    inFlightPathPromises.delete(entry.path);
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

export const installedRegistry = adapterRegistry;

export async function loadCoreAdapters(context = {}) {
  await Promise.all([
    loadPaths(pathsForSpecies(), context),
    loadPaths(pathsForFeats(), context),
    loadPaths(pathsForItems(), context),
    loadPaths(pathsForCoreRuntime(), context),
  ]);
  return adapterRegistry;
}

export async function loadClassAdapters(classNames, context = {}) {
  const names = (Array.isArray(classNames) ? classNames : [classNames]).filter(Boolean);
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
  const spellsPaths = Object.keys(adapterModules).filter((path) => path.startsWith('./spells/'));
  await loadPaths(spellsPaths, context);
  return adapterRegistry;
}

export async function loadConvertedAdapters(context = {}) {
  const all = Object.keys(adapterModules);
  await loadPaths(all, context);
  return adapterRegistry;
}

export function reinstallAdapters(context = {}) {
  installAdapters(installedAdapters, adapterRegistry, context);
}

export { adapterRegistry };
