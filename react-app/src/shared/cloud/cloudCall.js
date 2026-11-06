// What every cloud call needs: who is signed in, and a deadline.

// How long a command (health, turn, fight vitals) waits before giving up.
export const CLOUD_COMMAND_TIMEOUT_MS = 8_000;

// The signed-in user of a Supabase client; throws when the session is missing
// or cannot be read.
export async function currentUser(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error('Not signed in.');
  return data.user;
}

// `promise`, or a rejection ("<label> timed out.", with `code`) after `ms`.
export function withTimeout(promise, ms, label, code) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(`${label} timed out.`), { code })), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}
