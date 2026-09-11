# simkl-export

Export your Simkl movies, TV shows and anime to CSV files.

## Features

- Exports all three library types: movies, shows, anime.
- Exports any combination of statuses: watching, plan to watch, on hold, dropped, completed.
- One row per watched episode for shows and anime (see [Output files](#output-files)).
- External ids per title: IMDb, TMDB, TVDB, MyAnimeList, AniDB, AniList, Kitsu (when Simkl has them).
- Excel-ready CSV: UTF-8 with BOM, comma-separated.

## Requirements

- Node.js 22 or newer. Check with:
  ```bash
  node --version
  ```
- A Simkl account ([simkl.com](https://simkl.com)).

## Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/<your-username>/simkl-export.git
   cd simkl-export
   npm install
   ```

2. Create a free Simkl app at [simkl.com/settings/developer](https://simkl.com/settings/developer/) → **Create New App**. No approval needed, the app is ready right away. Fill in the form:

   | Field | What to type |
   | --- | --- |
   | Name | Anything, e.g. `simkl-export` |
   | Description | Anything, e.g. `Personal CSV backup` |
   | Website | Anything, e.g. `http://localhost` |
   | Redirect URI | Anything, e.g. `http://localhost` |

   `simkl-export` uses the PIN flow, so it never sends a redirect and does not need a `client_secret` — the `Website` and `Redirect URI` fields are required by the form but not used by this app. After you save, open the app to see its `client_id`.

   > If any field on the real form is unclear or does not match this table, ask before continuing — the form may have changed since this was written.

3. Copy the env file and paste your `client_id`:

   ```bash
   cp .env.example .env
   ```

   Open `.env` and set `SIMKL_CLIENT_ID=<your client_id>`.

4. Log in:

   ```bash
   node bin/simkl-export.js login
   ```

   You will see:

   ```
   Connect simkl-export to your Simkl account:

     1. Open  https://simkl.com/pin
     2. Enter this code:  ABCD1234

   The code expires in 15 minutes.
   ```

   Open [simkl.com/pin](https://simkl.com/pin) in a browser, sign in, and type the code shown in your terminal. `simkl-export` polls in the background and saves the access token into `.env` as soon as you approve it — no need to press anything else in the terminal.

5. Optional — use `simkl-export` from any folder:

   ```bash
   npm link
   ```

   Then run `simkl-export export` instead of `node bin/simkl-export.js export`. The examples below use the short form; replace it with `node bin/simkl-export.js` if you skipped this step.

## Usage

With no flags, in an interactive terminal, `export` asks what to export:

```bash
simkl-export export
```

With flags, no prompts (scriptable):

```bash
simkl-export export --types movies,anime --status completed
simkl-export export --out ~/backups/simkl
simkl-export export --types anime
simkl-export export --status completed,watching --out ~/backups/simkl
```

With no flags and no interactive terminal (e.g. cron), it exports everything with the defaults.

### Options

| Option | Description | Default |
| --- | --- | --- |
| `--types <list>` | Comma-separated types: `movies,shows,anime` | all types |
| `--status <list>` | Comma-separated statuses: `watching,plantowatch,hold,dropped,completed` | all statuses |
| `--out <dir>` | Base folder for the export. A dated subfolder is created inside. | `./export` |

Run `simkl-export export --help` or `simkl-export login --help` for the same options with examples.

## Output files

```
<out>/YYYY-MM-DD/
├── movies.csv
├── shows.csv
├── anime.csv
└── all.csv
```

`YYYY-MM-DD` is the local date of the run. Re-running the export on the same day overwrites that day's files. `all.csv` is the union of the other three, with a `type` column.

| Column | Meaning |
| --- | --- |
| `type` | `movie`, `show` or `anime` (`all.csv` only). |
| `title` | English title. |
| `year` | Release year. |
| `anime_type` | Simkl content type for anime: `tv`, `movie`, `ova`, `ona`, `special`, `music video` (`anime.csv` and `all.csv` only). |
| `status` | `watching`, `plantowatch`, `hold`, `dropped` or `completed`. |
| `season` | Season number of the watched episode. Empty for movies, or a show/anime with no watched episodes. |
| `episode` | Episode number of the watched episode. Empty in the same cases as `season`. |
| `episode_watched_at` | Date and time you watched that episode. |
| `last_watched_at` | Date and time you last watched something for this title, per Simkl. |
| `added_to_watchlist_at` | Date and time you added the title to your list. |
| `simkl_id`, `imdb_id`, `tmdb_id`, `tvdb_id`, `mal_id`, `anidb_id`, `anilist_id`, `kitsu_id` | External ids for the title, one column per catalog. |

Notes:

- One row per watched episode: a show or anime with no watched episodes still gets one row, with `season`, `episode` and `episode_watched_at` left empty.
- Dates are ISO 8601 in UTC (e.g. `2024-03-02T18:41:05Z`), exactly as Simkl returns them.
- Titles are in English.
- An empty cell means the value is not available on Simkl for that title (not a bug).

**Tip for Italian/European Excel:** if a file opens with everything crammed into column A, use *Data → From Text/CSV* (or *Data → Get Data → From File → From Text/CSV*) and pick comma as the delimiter, instead of double-clicking the file.

## Automatic backups (optional)

`simkl-export export` needs no flags to run unattended: with no interactive terminal it uses the defaults. Add a weekly `cron` line, for example every Monday at 6 AM:

```cron
0 6 * * 1 cd /path/to/simkl-export && node bin/simkl-export.js export >> export/cron.log 2>&1
```

Use absolute paths for `cd` and, if `node` is not on `cron`'s `PATH`, for `node` too (check with `which node`).

## Troubleshooting

| Message | Cause | Fix |
| --- | --- | --- |
| `SIMKL_CLIENT_ID is not set.` | `.env` is missing, or `SIMKL_CLIENT_ID` is empty. | Follow [Setup](#setup) steps 2–3: create an app, `cp .env.example .env`, paste the `client_id`. |
| `You are not logged in.` | `SIMKL_ACCESS_TOKEN` is empty in `.env`. | Run `simkl-export login`. |
| `Simkl rejected your access token.` | The saved token is invalid or was revoked on Simkl's side (HTTP 401). | Run `simkl-export login` again. |
| `Simkl rejected your client_id.` | `SIMKL_CLIENT_ID` is wrong or the app was suspended (HTTP 412). | Check `SIMKL_CLIENT_ID` in `.env`. Copy it again from [simkl.com/settings/developer](https://simkl.com/settings/developer/). |
| `The login code expired.` | The PIN shown by `login` was not approved on [simkl.com/pin](https://simkl.com/pin) within 15 minutes. | Run `simkl-export login` again and enter the code sooner. |
| `Simkl rate limit reached.` | Too many requests in a short time (HTTP 429), even after automatic retries. | Wait a minute and run the command again. |
| `Simkl is not available right now (HTTP <status>).` | Simkl's API had a server error (HTTP 5xx), even after automatic retries. | Try again later. |
| `Cannot reach api.simkl.com.` | No internet connection, DNS failure, or Simkl is unreachable from your network. | Check your internet connection. |
| `Simkl returned an unexpected error (HTTP <status>).` | An API error not covered above. | Run with `DEBUG=1` for the stack trace, or open an issue with the message and status code. |
| `simkl-export needs Node.js 22 or newer (you have <version>).` | Your Node.js version is older than 22. | Install Node.js 22 or newer, e.g. with [nvm](https://github.com/nvm-sh/nvm): `nvm install 22`. |

## Privacy

- Your access token stays in `.env`, on your machine. `simkl-export` never sends it anywhere except `api.simkl.com`.
- `.env` and `export/` are gitignored: they are never committed.
- `simkl-export` only reads your Simkl library. It never writes, rates or changes anything on your Simkl account.

## Development

```bash
npm test
```

Project structure:

```
bin/simkl-export.js        CLI entry: loads .env, defines commands (commander)
src/config.js               Reads and validates env values; writes the token to .env
src/simklClient.js          SimklClient class: HTTP GET with required params, headers, errors, 429 retry
src/errors.js                Error classes with user-facing hints
src/auth/pinLogin.js        PIN flow: request code, poll for token
src/commands/login.js       `login` command: UI around pinLogin
src/library.js               Fetches /sync/all-items per type, applies status filter
src/rows.js                  Maps API items to flat CSV rows; column lists
src/csvWriter.js             Writes per-type CSVs + all.csv
src/commands/export.js      `export` command: options, prompts, spinner, summary
test/                        node:test files + fixtures
```

## Credits

Data provided by [Simkl](https://simkl.com).

## License

ISC
