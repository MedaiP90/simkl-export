#!/usr/bin/env node

const MIN_NODE_MAJOR = 22;
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < MIN_NODE_MAJOR) {
  console.error(`simkl-export needs Node.js 22 or newer (you have ${process.version}).`);
  process.exit(1);
}

// Static ESM imports run before any code above, so everything that needs the
// Node version we just checked is loaded dynamically, after the check.
const { Command } = await import('commander');
const { default: pc } = await import('picocolors');
const { ENV_PATH, APP_VERSION } = await import('../src/config.js');
const { AppError } = await import('../src/errors.js');
const { TYPES, STATUSES } = await import('../src/library.js');
const { makeListParser } = await import('../src/exportOptions.js');
const { login } = await import('../src/commands/login.js');
const { exportCommand } = await import('../src/commands/export.js');

const parseTypes = makeListParser(TYPES, { singular: 'type', plural: 'types' });
const parseStatuses = makeListParser(STATUSES, { singular: 'status', plural: 'statuses' });

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
  .addHelpText(
    'after',
    `
Examples:
  $ simkl-export login`,
  )
  .action(async () => {
    await login();
  });

program
  .command('export')
  .description('Export your movies, shows and anime to CSV files')
  .option('--types <list>', 'Comma-separated types: movies,shows,anime', parseTypes)
  .option(
    '--status <list>',
    'Comma-separated statuses: watching,plantowatch,hold,dropped,completed',
    parseStatuses,
  )
  .option(
    '--out <dir>',
    'Base folder for the export. A dated subfolder is created inside.',
  )
  .addHelpText(
    'after',
    `
Examples:
  $ simkl-export export
  $ simkl-export export --types anime
  $ simkl-export export --status completed,watching --out ~/backups/simkl`,
  )
  .action(async (options) => {
    await exportCommand(options);
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
