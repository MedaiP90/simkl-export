/** Column lists per CSV file, in the fixed output order. */
export const COLUMNS = {
  movies: ['title', 'year', 'status', 'last_watched_at', 'added_to_watchlist_at', 'simkl_id', 'imdb_id', 'tmdb_id', 'tvdb_id'],
  shows: ['title', 'year', 'status', 'season', 'episode', 'episode_watched_at', 'last_watched_at', 'added_to_watchlist_at', 'simkl_id', 'imdb_id', 'tmdb_id', 'tvdb_id'],
  anime: ['title', 'year', 'anime_type', 'status', 'season', 'episode', 'episode_watched_at', 'last_watched_at', 'added_to_watchlist_at', 'simkl_id', 'mal_id', 'anidb_id', 'anilist_id', 'kitsu_id', 'imdb_id', 'tmdb_id', 'tvdb_id'],
};
COLUMNS.all = ['type', ...unionColumns()];

/** Column name → `media.ids` field name, for the id-shaped columns. */
const ID_FIELDS = {
  simkl_id: 'simkl',
  imdb_id: 'imdb',
  tmdb_id: 'tmdb',
  tvdb_id: 'tvdb',
  mal_id: 'mal',
  anidb_id: 'anidb',
  anilist_id: 'anilist',
  kitsu_id: 'kitsu',
};

/** Maps missing/null/undefined to `''`. Leaves numbers and other values as-is. */
function value(v) {
  return v === null || v === undefined ? '' : v;
}

/** The title-level media object: `item.movie` for movies, `item.show` for shows and anime. */
function mediaOf(type, item) {
  return type === 'movies' ? item.movie : item.show;
}

/** Watched episodes across all seasons, sorted by season then episode number. */
function watchedEpisodes(item) {
  const seasons = [...(item.seasons ?? [])].sort((a, b) => a.number - b.number);
  const rows = [];
  for (const season of seasons) {
    const episodes = [...(season.episodes ?? [])].sort((a, b) => a.number - b.number);
    for (const episode of episodes) {
      if (episode.watched_at) {
        rows.push({ season: season.number, episode: episode.number, episode_watched_at: episode.watched_at });
      }
    }
  }
  return rows;
}

/** Builds one row with exactly the keys of `COLUMNS[type]`, filling each from its source. */
function buildRow(type, item, media, episode = {}) {
  const row = {};
  for (const column of COLUMNS[type]) {
    switch (column) {
      case 'title':
        row.title = value(media?.title);
        break;
      case 'year':
        row.year = value(media?.year);
        break;
      case 'status':
        row.status = value(item.status);
        break;
      case 'last_watched_at':
        row.last_watched_at = value(item.last_watched_at);
        break;
      case 'added_to_watchlist_at':
        row.added_to_watchlist_at = value(item.added_to_watchlist_at);
        break;
      case 'anime_type':
        row.anime_type = value(item.anime_type);
        break;
      case 'season':
        row.season = value(episode.season);
        break;
      case 'episode':
        row.episode = value(episode.episode);
        break;
      case 'episode_watched_at':
        row.episode_watched_at = value(episode.episode_watched_at);
        break;
      default:
        row[column] = value(media?.ids?.[ID_FIELDS[column]]);
    }
  }
  return row;
}

/**
 * Maps one Simkl library item to its CSV rows.
 * Movies produce one row. Shows/anime produce one row per watched episode,
 * or a single row with empty episode fields when none is watched.
 */
export function toRows(type, item) {
  const media = mediaOf(type, item);

  if (type === 'movies') {
    return [buildRow(type, item, media)];
  }

  const episodes = watchedEpisodes(item);
  const episodeRows = episodes.length ? episodes : [{ season: '', episode: '', episode_watched_at: '' }];
  return episodeRows.map((episode) => buildRow(type, item, media, episode));
}

const SINGULAR_TYPE = { movies: 'movie', shows: 'show', anime: 'anime' };

/** Adds the `type` column and fills any `COLUMNS.all` column absent from `row` with `''`. */
export function toAllRow(type, row) {
  const allRow = { type: SINGULAR_TYPE[type] };
  for (const column of COLUMNS.all) {
    if (column === 'type') continue;
    allRow[column] = column in row ? row[column] : '';
  }
  return allRow;
}

/** `all.csv` columns: the anime list, then any column from the other lists not already in it. */
function unionColumns() {
  const union = [...COLUMNS.anime];
  const seen = new Set(union);
  for (const column of [...COLUMNS.movies, ...COLUMNS.shows]) {
    if (!seen.has(column)) {
      union.push(column);
      seen.add(column);
    }
  }
  return union;
}
