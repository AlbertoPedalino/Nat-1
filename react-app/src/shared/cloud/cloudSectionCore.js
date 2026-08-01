async function requireUser(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error('Not signed in.');
  return data.user;
}

function localEntry(descriptor, id) {
  return descriptor.readRegistry().find((entry) => entry.id === id) || null;
}

export function createSectionCloudApi(descriptor, { getClient }) {
  if (!descriptor || typeof getClient !== 'function') throw new Error('Cloud section configuration missing.');

  async function pushInstance(id) {
    const cleanId = descriptor.sanitizeId(id);
    const entry = cleanId && cleanId !== 'new' ? localEntry(descriptor, cleanId) : null;
    if (!entry) return null;
    const payload = descriptor.readPayload(cleanId);
    if (!payload || Object.keys(payload).length === 0) return null;

    const client = getClient();
    const user = await requireUser(client);
    const row = {
      id: cleanId,
      owner: user.id,
      owner_username: user.user_metadata?.username || null,
      name: entry.name || descriptor.defaultName(cleanId),
      data: payload,
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from(descriptor.table).upsert(row, { onConflict: 'id' });
    if (error) throw error;
    return row;
  }

  async function pullInstance(id) {
    const cleanId = descriptor.sanitizeId(id);
    if (!cleanId || cleanId === 'new') throw new Error('Invalid section instance id.');
    const client = getClient();
    const { data, error } = await client
      .from(descriptor.table)
      .select('id, name, data, updated_at')
      .eq('id', cleanId)
      .single();
    if (error) throw error;
    if (!data?.data) throw new Error('No cloud data for this instance.');
    descriptor.writePayload(cleanId, data.data, {
      name: data.name || descriptor.defaultName(cleanId),
      updatedAt: Date.parse(data.updated_at) || 0,
    });
    localStorage.setItem(descriptor.activeKey, cleanId);
    return data.data;
  }

  async function fetchInstanceMeta(id) {
    const cleanId = descriptor.sanitizeId(id);
    if (!cleanId || cleanId === 'new') return null;
    const { data, error } = await getClient()
      .from(descriptor.table)
      .select('id, updated_at')
      .eq('id', cleanId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function listInstances() {
    const client = getClient();
    const user = await requireUser(client);
    const { data, error } = await client
      .from(descriptor.table)
      .select('id, name, owner, owner_username, updated_at')
      .eq('owner', user.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function renameCloudInstance(id, nextName) {
    const cleanId = descriptor.sanitizeId(id);
    const name = String(nextName || '').trim();
    if (!cleanId || cleanId === 'new') throw new Error('Invalid section instance id.');
    if (!name) throw new Error('The instance name cannot be empty.');

    const client = getClient();
    const user = await requireUser(client);
    const { error } = await client
      .from(descriptor.table)
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', cleanId)
      .eq('owner', user.id);
    if (error) throw error;
    return name;
  }

  async function deleteCloudInstance(id) {
    const cleanId = descriptor.sanitizeId(id);
    if (!cleanId || cleanId === 'new') return;
    const client = getClient();
    const user = await requireUser(client);
    const { error } = await client
      .from(descriptor.table)
      .delete()
      .eq('id', cleanId)
      .eq('owner', user.id);
    if (error) throw error;
  }

  return Object.freeze({
    pushInstance,
    pullInstance,
    fetchInstanceMeta,
    listInstances,
    renameCloudInstance,
    deleteCloudInstance,
  });
}
