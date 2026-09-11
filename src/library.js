/** Library types the app can export. */
export const TYPES = ['movies', 'shows', 'anime'];

/** Watch statuses the app can filter on. */
export const STATUSES = ['watching', 'plantowatch', 'hold', 'dropped', 'completed'];

const LIBRARY_QUERY = {
  extended: 'full',
  episode_watched_at: 'yes',
  include_all_episodes: 'yes',
  language: 'en',
};

/**
 * Downloads the user's library for `types`, keeping only items whose
 * status is in `statuses`. Calls `onProgress(type, count)` after each type.
 * Returns `{ [type]: item[] }` with only the requested types as keys.
 */
export async function fetchLibrary(client, { types, statuses, onProgress }) {
  const library = {};

  for (const type of types) {
    const body = await client.get(`/sync/all-items/${type}`, LIBRARY_QUERY);
    const items = body?.[type] ?? [];
    const filtered = items.filter((item) => statuses.includes(item.status));

    library[type] = filtered;
    onProgress?.(type, filtered.length);
  }

  return library;
}
