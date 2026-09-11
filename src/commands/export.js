import { checkbox, input } from '@inquirer/prompts';
import { ExitPromptError } from '@inquirer/core';
import ora from 'ora';
import pc from 'picocolors';
import path from 'node:path';
import { getClientId, getAccessToken } from '../config.js';
import { SimklClient } from '../simklClient.js';
import { TYPES, STATUSES, fetchLibrary } from '../library.js';
import { toRows } from '../rows.js';
import { writeExport, resolveOutputDir } from '../csvWriter.js';

const DEFAULT_OUT = './export';

const STATUS_LABELS = {
  watching: 'Watching',
  plantowatch: 'Plan to watch',
  hold: 'On hold',
  dropped: 'Dropped',
  completed: 'Completed',
};

/** `export` command: resolves options (flags or prompts), fetches the library, writes CSVs. */
export async function exportCommand(options) {
  getClientId();
  const accessToken = getAccessToken();

  let selection;
  try {
    selection = await resolveSelection(options);
  } catch (err) {
    if (err instanceof ExitPromptError) {
      console.log('Export cancelled.');
      process.exit(130);
    }
    throw err;
  }

  const client = new SimklClient({ clientId: getClientId(), accessToken });
  const library = await fetchWithSpinner(client, selection);

  const rowsByType = {};
  for (const type of selection.types) {
    rowsByType[type] = library[type].flatMap((item) => toRows(type, item));
  }

  const outputDir = resolveOutputDir(selection.out);
  const results = await writeExport(outputDir, rowsByType);

  printSummary(outputDir, results);

  const totalItems = selection.types.reduce((sum, type) => sum + library[type].length, 0);
  if (totalItems === 0) {
    console.log(pc.yellow('No items found for the selected types and statuses.'));
  }
}

/** Flags win when at least one is given. Otherwise prompts on a TTY, defaults without one. */
async function resolveSelection(options) {
  const flagsGiven = options.types !== undefined || options.status !== undefined || options.out !== undefined;

  if (flagsGiven) {
    return {
      types: options.types ?? TYPES,
      statuses: options.status ?? STATUSES,
      out: options.out ?? DEFAULT_OUT,
    };
  }

  if (!process.stdin.isTTY) {
    return { types: TYPES, statuses: STATUSES, out: DEFAULT_OUT };
  }

  const types = await checkbox({
    message: 'What do you want to export?',
    choices: TYPES.map((type) => ({ name: type, value: type, checked: true })),
    validate: (selected) => selected.length > 0 || 'Select at least one type.',
  });

  const statuses = await checkbox({
    message: 'Which statuses?',
    choices: STATUSES.map((status) => ({ name: STATUS_LABELS[status], value: status, checked: true })),
    validate: (selected) => selected.length > 0 || 'Select at least one status.',
  });

  const out = await input({ message: 'Output folder:', default: DEFAULT_OUT });

  return { types, statuses, out };
}

/** Fetches each selected type, moving an `ora` spinner from one type to the next. */
async function fetchWithSpinner(client, selection) {
  const spinner = ora(`Fetching ${selection.types[0]}…`).start();
  try {
    return await fetchLibrary(client, {
      types: selection.types,
      statuses: selection.statuses,
      onProgress: (type, count) => {
        spinner.succeed(`${type}: ${count} items`);
        const nextType = selection.types[selection.types.indexOf(type) + 1];
        if (nextType) spinner.start(`Fetching ${nextType}…`);
      },
    });
  } catch (err) {
    spinner.fail();
    throw err;
  }
}

function printSummary(outputDir, results) {
  const nameWidth = Math.max(...results.map(({ file }) => path.basename(file).length));

  console.log(pc.green(`✔ Export complete → ${outputDir}`));
  console.log();
  for (const { file, rowCount } of results) {
    const name = path.basename(file).padEnd(nameWidth + 5);
    console.log(`  ${name}${String(rowCount).padStart(5)} rows`);
  }
  console.log();
  console.log('Open the files in Excel, LibreOffice or Google Sheets.');
  console.log('Column descriptions: see README.md → "Output files".');
}
