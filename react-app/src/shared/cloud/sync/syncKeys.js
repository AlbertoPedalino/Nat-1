// The keys of `sync_digest` (supabase/26_sync_digest.sql): one per thing a
// client has open, `<kind>:<id>`. The SQL answers each with a revision (or a
// hash of a list's ids and revisions); keep the two in step.
const key = (kind) => (id) => `${kind}:${id}`;

export const syncKeys = Object.freeze({
  // Characters.
  sheet: key('sheet'), // a character's sheet_revision
  campaignDigests: key('digests'), // every character digest of a campaign
  characterDigest: key('digest'), // one character's digest
  // Encounter fights.
  instanceFights: key('fights'), // every fight of an encounter builder
  fight: key('fight'),
  // Tool instances: `table` is the section's table (boards, encounters, dm_screens).
  instance: (table, id) => `${table}:${id}`,
  myInstances: key('my'), // the caller's own rows of a section table
  // Campaigns and their tools.
  campaign: key('campaign'), // name and tool links
  boardCampaigns: key('board-campaigns'), // the campaigns using a hexcrawl board
  clock: key('clock'),
  clockLog: key('clock-log'),
  liveScene: key('live-scene'),
  // Battle map.
  scene: key('scene'),
  tokens: key('tokens'),
  drawings: key('drawings'),
  tokenSecrets: key('token-secrets'),
  sceneTurn: key('scene-turn'),
  hexCells: key('hex-cells'),
});
