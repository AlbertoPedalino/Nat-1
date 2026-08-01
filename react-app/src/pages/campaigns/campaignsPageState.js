export function resolveCampaignsPageState({ cloudEnabled, status }) {
  if (!cloudEnabled) return 'unconfigured';
  if (status === 'loading') return 'loading';
  if (status !== 'authed') return 'signedOut';
  return 'authed';
}
