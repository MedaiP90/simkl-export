# simkl-export

Export your data from [Simkl](https://simkl.com).

## Status

Project setup in progress. `login` works end to end. `export` not implemented yet.

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

## License

ISC
