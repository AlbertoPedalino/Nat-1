export function composeMissingPath(location) {
  const pathname = typeof location?.pathname === 'string' && location.pathname
    ? location.pathname
    : '/';
  const search = typeof location?.search === 'string' ? location.search : '';
  const hash = typeof location?.hash === 'string' ? location.hash : '';

  return `${pathname}${search}${hash}`;
}
