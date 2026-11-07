// Small helpers around localStorage. Every access is wrapped because storage
// can be unavailable (private windows, blocked site data).

// Local cache of a user's projects, scoped per account. (The old
// 'tilemaker_projects_v1' key was shared by every account in the browser, so
// it is intentionally no longer read.)
const STORAGE_KEY_PREFIX = 'tilemaker_projects_v2';

export const cacheKeys = (userId) => ({
  projects: `${STORAGE_KEY_PREFIX}:${userId}`,
  // IDs of projects with local changes the server hasn't confirmed yet.
  unsynced: `${STORAGE_KEY_PREFIX}:${userId}:unsynced`,
  // Whether this person has already seen the guided tour.
  tourSeen: `cardcreator:tour-seen:${userId}`,
});

export const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Local cache write failed:', err);
  }
};
