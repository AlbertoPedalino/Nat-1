// The only Supabase path for tool instances (tables `boards`, `encounters`,
// `dm_screens`; rows are owner-only by RLS).
//
// A row's `updated_at` is its data version: every data write sets a new one,
// and an UPDATE of data is conditional on the version the writer started from,
// so two copies can never silently overwrite each other. Name and link-group
// changes are metadata: they leave the version alone, so renaming on one
// device does not turn another device's data save into a conflict.

const META_COLUMNS = 'id, name, link_group_id, updated_at';
const ROW_COLUMNS = 'id, name, link_group_id, data, updated_at';

export async function currentUser(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error('Not signed in.');
  return data.user;
}

// A version strictly after `base`, so a quick second save never reuses it.
export function nextVersion(base) {
  const after = (Date.parse(base) || 0) + 1;
  return new Date(Math.max(Date.now(), after)).toISOString();
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

// INSERT only: `{ row }` on success, `{ duplicate: true }` if the id exists.
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

// UPDATE of data, only if the row is still at `baseVersion`. Returns the new
// row, or null when the row moved on (or is gone).
export async function updateData(client, section, id, baseVersion, patch) {
  const user = await currentUser(client);
  const { data, error } = await client
    .from(section.table)
    .update({ ...patch, owner_username: user.user_metadata?.username || null })
    .eq('id', id)
    .eq('owner', user.id)
    .eq('updated_at', baseVersion)
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
