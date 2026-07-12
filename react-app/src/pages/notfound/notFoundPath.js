export function composeMissingPath(location) {
  return `${location.pathname}${location.search}${location.hash}`;
}
