#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Command } from 'commander';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile(path.join(projectRoot, '.env'));
} catch {
  // No .env file yet, continue with process.env as is.
}

const packageJson = JSON.parse(
  readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
);

const program = new Command();

program
  .name('simkl-export')
  .description("Export your Simkl library (movies, shows, anime) to CSV files.")
  .version(packageJson.version);

program
  .command('login')
  .description('Connect your Simkl account (one time)')
  .action(() => {
    console.log('Not implemented yet.');
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

program.parse();
