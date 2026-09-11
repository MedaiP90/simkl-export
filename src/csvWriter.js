import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stringify } from 'csv-stringify/sync';
import { COLUMNS, toAllRow } from './rows.js';

/** `YYYY-MM-DD` for the local date of `date`. */
function localDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Resolves `<baseDir>/YYYY-MM-DD` (local date), with `baseDir` relative to `process.cwd()`. */
export function resolveOutputDir(baseDir = './export', now = new Date()) {
  return path.resolve(process.cwd(), baseDir, localDate(now));
}

/** Serializes `rows` to CSV text with a UTF-8 BOM, using `columns` as the fixed header order. */
export function toCsv(columns, rows) {
  return stringify(rows, { header: true, columns, bom: true });
}

/**
 * Writes `movies.csv`, `shows.csv`, `anime.csv` for each type in `rowsByType`, plus `all.csv`.
 * Returns `[{ file, rowCount }]` with the absolute path and row count of each file written.
 */
export async function writeExport(outputDir, rowsByType) {
  await mkdir(outputDir, { recursive: true });

  const results = [];
  const allRows = [];

  for (const [type, rows] of Object.entries(rowsByType)) {
    const file = path.join(outputDir, `${type}.csv`);
    await writeFile(file, toCsv(COLUMNS[type], rows));
    results.push({ file, rowCount: rows.length });
    for (const row of rows) allRows.push(toAllRow(type, row));
  }

  const allFile = path.join(outputDir, 'all.csv');
  await writeFile(allFile, toCsv(COLUMNS.all, allRows));
  results.push({ file: allFile, rowCount: allRows.length });

  return results;
}
