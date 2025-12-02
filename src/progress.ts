/**
 * Progress tracking utilities for the autonomous coding agent
 *
 * Provides functions to:
 * - Count passing tests from feature_list.json
 * - Display session headers
 * - Print progress summaries
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProgressInfo, FeatureList } from './types.js';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Count the number of passing tests from feature_list.json
 */
export async function countPassingTests(projectDir: string): Promise<ProgressInfo> {
  const featureListPath = join(projectDir, 'feature_list.json');

  try {
    const content = await readFile(featureListPath, 'utf-8');
    const featureList: FeatureList = JSON.parse(content);

    const total = featureList.features.length;
    const passing = featureList.features.filter(f => f.passes).length;

    return { passing, total };
  } catch (error) {
    // File doesn't exist or is invalid JSON
    return { passing: 0, total: 0 };
  }
}

/**
 * Print a formatted session header
 */
export function printSessionHeader(
  sessionNum: number,
  sessionType: 'initializer' | 'enhancer' | 'coding' = 'coding'
): void {
  const typeLabels: Record<string, string> = {
    initializer: 'INITIALIZER',
    enhancer: 'ENHANCER',
    coding: 'CODING AGENT',
  };
  const typeColors: Record<string, string> = {
    initializer: colors.magenta,
    enhancer: colors.yellow,
    coding: colors.cyan,
  };

  const label = typeLabels[sessionType];
  const color = typeColors[sessionType];

  console.log();
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(
    `${colors.bold}${color}  SESSION ${sessionNum}: ${label}${colors.reset}`
  );
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log();
}

/**
 * Print a progress summary showing test completion
 */
export async function printProgressSummary(projectDir: string): Promise<void> {
  const { passing, total } = await countPassingTests(projectDir);

  if (total === 0) {
    console.log(
      `${colors.dim}Progress: feature_list.json not yet created${colors.reset}`
    );
    return;
  }

  const percentage = Math.round((passing / total) * 100);
  const progressBar = createProgressBar(passing, total, 30);

  let statusColor = colors.yellow;
  if (percentage >= 100) {
    statusColor = colors.green;
  } else if (percentage >= 50) {
    statusColor = colors.blue;
  }

  console.log();
  console.log(`${colors.bold}Progress:${colors.reset}`);
  console.log(`  ${progressBar}`);
  console.log(
    `  ${statusColor}${passing}/${total} tests passing (${percentage}%)${colors.reset}`
  );
  console.log();
}

/**
 * Create a visual progress bar
 */
function createProgressBar(current: number, total: number, width: number): string {
  const percentage = total > 0 ? current / total : 0;
  const filled = Math.round(percentage * width);
  const empty = width - filled;

  const filledBar = `${colors.green}${'█'.repeat(filled)}${colors.reset}`;
  const emptyBar = `${colors.dim}${'░'.repeat(empty)}${colors.reset}`;

  return `[${filledBar}${emptyBar}]`;
}

/**
 * Print a delay countdown message
 */
export async function printDelayCountdown(seconds: number): Promise<void> {
  console.log(
    `${colors.dim}Starting next session in ${seconds} seconds... (Ctrl+C to pause)${colors.reset}`
  );

  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r${colors.dim}  ${i}...${colors.reset}  `);
    await sleep(1000);
  }
  process.stdout.write('\r        \r');
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Print completion message when all tests pass
 */
export function printCompletionMessage(): void {
  console.log();
  console.log(`${colors.bold}${colors.green}${'='.repeat(60)}${colors.reset}`);
  console.log(
    `${colors.bold}${colors.green}  🎉 ALL TESTS PASSING! PROJECT COMPLETE! 🎉${colors.reset}`
  );
  console.log(`${colors.bold}${colors.green}${'='.repeat(60)}${colors.reset}`);
  console.log();
}

/**
 * Print error message
 */
export function printError(message: string): void {
  console.error(`${colors.bold}\x1b[31mError: ${message}${colors.reset}`);
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

/**
 * Print warning message
 */
export function printWarning(message: string): void {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}
