// The only Supabase path for tool instances (tables `boards`, `encounters`,
// `dm_screens`; rows are owner-only by RLS).
//
// A row's `version` (supabase/18_section_versions.sql) is its data revision,
// maintained by the database alone: 0 on INSERT, +1 on every UPDATE that
// changes `data`, untouched by name/link updates. An UPDATE of data is
// conditional on the version the writer started from, so two copies can never
// silently overwrite each other; renaming on one device never turns another
// device's data save into a conflict. `updated_at` is only a timestamp for
// sorting and display, set by the database too; clients never send either.

const META_COLUMNS = 'id, name, link_group_id, version, updated_at';
const ROW_COLUMNS = 'id, name, link_group_id, data, version, updated_at';

export async function currentUser(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error('Not signed in.');
  return data.user;
}

// Postgres unique_violation: the id already has a row.
function isDuplicate(error) {
  return error?.code === '23505';
}

export async function fetchMeta(client, section, id) {
  const { data, error } = await client.from(section.table).select(META_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function fetchRow(client, section, id) {
  const { data, error } = await client.from(section.table).select(ROW_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function listRows(client, section) {
  const user = await currentUser(client);
  const { data, error } = await client
    .from(section.table)
    .select('id, name, link_group_id, owner, owner_username, updated_at')
    .eq('owner', user.id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// INSERT only: `{ row }` (with the version the database gave it) on success,
// `{ duplicate: true }` if the id exists.
export async function insertRow(client, section, row) {
  const user = await currentUser(client);
  const { data, error } = await client
    .from(section.table)
    .insert({ ...row, owner: user.id, owner_username: user.user_metadata?.username || null })
    .select(META_COLUMNS)
    .maybeSingle();
  if (isDuplicate(error)) return { duplicate: true };
  if (error) throw error;
  if (!data) throw new Error('Could not save this tool instance.');
  return { row: data };
}

// UPDATE of data, only if the row is still at `baseVersion`; the database
// increments the version. Returns the updated row, or null when the row moved
// on (or is gone).
export async function updateData(client, section, id, baseVersion, patch) {
  const user = await currentUser(client);
  const { data, error } = await client
    .from(section.table)
    .update({ ...patch, owner_username: user.user_metadata?.username || null })
    .eq('id', id)
    .eq('owner', user.id)
    .eq('version', baseVersion)
    .select(META_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// Name / link group only; the data version is untouched. Null if no row.
export async function updateMeta(client, section, id, patch) {
  const user = await currentUser(client);
  const { data, error } = await client
    .from(section.table)
    .update(patch)
    .eq('id', id)
    .eq('owner', user.id)
    .select(META_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function deleteRow(client, section, id) {
  const user = await currentUser(client);
  const { error } = await client.from(section.table).delete().eq('id', id).eq('owner', user.id);
  if (error) throw error;
}
