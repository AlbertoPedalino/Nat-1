// What a database error means, by its code, in one place.

// Postgres unique_violation: the row already exists.
export function isUniqueViolation(error) {
  return error?.code === '23505';
}

// The function called does not exist (yet): PostgREST cannot find it, or
// Postgres has no such function — a migration not run on this project.
export function isMissingRpc(error) {
  return error?.code === 'PGRST202' || error?.code === '42883';
}

// Postgres no_data_found: the function ran and found no such row.
export function isNoDataFound(error) {
  return error?.code === 'P0002';
}
