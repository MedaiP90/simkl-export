import { InvalidArgumentError } from 'commander';

/**
 * Builds a commander argument parser for a comma-separated list option.
 * Trims, lowercases and dedupes the items, then validates each against
 * `validValues`. Rejects with `InvalidArgumentError` on an unknown value.
 */
export function makeListParser(validValues, { singular, plural }) {
  return function parseList(value) {
    const items = [
      ...new Set(
        value
          .split(',')
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    for (const item of items) {
      if (!validValues.includes(item)) {
        throw new InvalidArgumentError(
          `Unknown ${singular} "${item}". Valid ${plural}: ${validValues.join(', ')}`,
        );
      }
    }

    return items;
  };
}
