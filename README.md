# simkl-export

Export your data from [Simkl](https://simkl.com).

## Status

Project setup in progress. `login` and `export` work end to end.

## Getting started

```bash
npm install
cp .env.example .env
```

1. Create a free app at https://simkl.com/settings/developer/ and put its
   `client_id` in `.env` as `SIMKL_CLIENT_ID`.
2. Run the login command and follow the on-screen code:

   ```bash
   node bin/simkl-export.js login
   ```

   This saves `SIMKL_ACCESS_TOKEN` into `.env`.

3. Export your library:

   ```bash
   node bin/simkl-export.js export
   ```

   With no flags in an interactive terminal, it asks what to export, which
   statuses and where to write the files. Non-interactively, it exports
   everything to `./export/<today>/`.

   Flags skip the prompts:

   ```bash
   node bin/simkl-export.js export --types movies,anime --status completed
   node bin/simkl-export.js export --out ~/backups/simkl
   ```

   Run `node bin/simkl-export.js export --help` for all options.

   Output: `movies.csv`, `shows.csv`, `anime.csv` (one per selected type)
   plus `all.csv` (all rows combined, with a `type` column) in
   `<out>/<YYYY-MM-DD>/`. Re-running on the same day overwrites that day's
   files.

## License

ISC
