// The shared recovery's one database read (src/shared/cloud/api/syncDigest.js),
// mocked for every UI test in tests/setup.js so no test reaches Supabase.
//
// By default the read fails, and the recovery calls every watcher with all its
// keys on each trigger (what it does when the database cannot answer). A test
// of the digest itself sets `syncDigest.answers` — an answer per key, 'v0'
// for any key not listed — and moves an answer to say that key moved.
export const syncDigest = {
  answers: null,
  reset() {
    this.answers = null;
  },
  read(keys) {
    if (!this.answers) return Promise.reject(new Error('No sync digest in this test.'));
    return Promise.resolve(Object.fromEntries(keys.map((key) => [key, this.answers[key] ?? 'v0'])));
  },
};
