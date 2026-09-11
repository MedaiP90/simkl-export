#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';
import { ENV_PATH, APP_VERSION } from '../src/config.js';
import { AppError } from '../src/errors.js';
import { login } from '../src/commands/login.js';

try {
  process.loadEnvFile(ENV_PATH);
} catch {
  // No .env file yet, continue with process.env as is.
}

const program = new Command();

program
  .name('simkl-export')
  .description("Export your Simkl library (movies, shows, anime) to CSV files.")
  .version(APP_VERSION);

program
  .command('login')
  .description('Connect your Simkl account (PIN code, one time)')
  .action(async () => {
    await login();
  });

program
  .command('export')
  .description('Export your movies, shows and anime to CSV files')
  .option('--types <list>', 'Comma-separated types: movies,shows,anime')
  .option(
    '--status <list>',
    'Comma-separated statuses: watching,plantowatch,hold,dropped,completed',
  )
  .option(
    '--out <dir>',
    'Base folder for the export. A dated subfolder is created inside.',
    './export',
  )
  .addHelpText(
    'after',
    `
Examples:
  $ simkl-export export
  $ simkl-export export --types anime
  $ simkl-export export --status completed,watching --out ~/backups/simkl`,
  )
  .action(() => {
    console.log('Not implemented yet.');
  });

program.addHelpText(
  'after',
  `
Examples:
  $ simkl-export login            Connect your Simkl account (one time)
  $ simkl-export export           Export everything to ./export/<date>/
  $ simkl-export export --types movies,anime --status completed`,
);

program.showHelpAfterError('Run "simkl-export --help" to see the commands.');

try {
  await program.parseAsync();
} catch (err) {
  if (err instanceof AppError) {
    console.error(pc.red(`✖ ${err.message}`));
    if (err.hint) {
      console.error(err.hint);
    }
  } else {
    console.error(pc.red(`✖ Unexpected error: ${err.message}`));
    if (process.env.DEBUG === '1') {
      console.error(err.stack);
    }
    console.error('Run with DEBUG=1 for details, or open an issue.');
  }
  process.exitCode = 1;
}
