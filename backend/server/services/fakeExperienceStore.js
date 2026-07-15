// backend/server/services/fakeExperienceStore.js
//
// Intentionally NOT a database table and NOT written to disk.
// Holds only the single most-recent fake-experience-check batch per user
// (recruiter or admin) in server memory, so the "Fake Experience Check"
// screen can show "last uploaded CVs" results if the user navigates away
// and comes back — but nothing here survives a server restart/redeploy,
// and a new upload for the same user replaces (does not append to) the
// previous batch.
//
// If you ever run multiple backend instances behind a load balancer,
// this store is per-instance — that's a deliberate trade-off for keeping
// this data out of Postgres entirely. If that becomes a problem, swap this
// for a Redis client with the same get/set/clear interface and a TTL (EX).

const store = new Map(); // key: `${role}:${userId}` -> { batch, savedAt }

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — auto-expire so memory can't grow unbounded

export const keyFor = (role, userId) => `${role}:${userId}`;

export function saveBatch(key, batch) {
  store.set(key, { batch, savedAt: Date.now() });
}

export function getBatch(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.batch;
}

export function clearBatch(key) {
  store.delete(key);
}

// Periodic sweep so expired entries don't sit in memory forever even if
// nobody calls getBatch() for that key again.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.savedAt > TTL_MS) store.delete(key);
  }
}, 30 * 60 * 1000).unref();
