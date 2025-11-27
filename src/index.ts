#!/usr/bin/env node

/**
 * Autonomous Coding Agent Demo
 *
 * Main entry point for the two-agent autonomous coding system.
 *
 * Usage:
 *   npx tsx src/index.ts --project-dir ./my_project
 *   npm run dev -- --project-dir ./my_project
 *
 * This implements a two-agent pattern:
 * 1. Initializer Agent: Creates feature_list.json with 200+ test cases
 * 2. Coding Agent: Implements features one by one, marking them as passing
 */

import { resolve, isAbsolute, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { Command } from 'commander';
import { runAutonomousAgent } from './agent.js';
import { printError, printInfo, printWarning } from './progress.js';

/**
 * Default values
 */
const DEFAULT_PROJECT_DIR = './autonomous_demo_project';
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const GENERATIONS_DIR = 'generations';

/**
 * Parse command line arguments
 */
function parseArgs(): { projectDir: string; maxIterations?: number; model: string } {
  const program = new Command();

  program
    .name('autonomous-agent')
    .description(
      'A demonstration of extended autonomous coding using the Claude Agent SDK.\n\n' +
        'This implements a two-agent pattern:\n' +
        '  1. Initializer Agent (Session 1): Creates feature_list.json with test cases\n' +
        '  2. Coding Agent (Sessions 2+): Implements features and marks them as passing\n\n' +
        'Environment Variables:\n' +
        '  ANTHROPIC_API_KEY    Required. Your Anthropic API key.\n\n' +
        'Examples:\n' +
        '  npx tsx src/index.ts --project-dir ./my_project\n' +
        '  npm run dev -- --project-dir ./my_project --max-iterations 10'
    )
    .version('1.0.0')
    .option(
      '-p, --project-dir <path>',
      'Project directory for the generated application',
      DEFAULT_PROJECT_DIR
    )
    .option(
      '-m, --max-iterations <number>',
      'Maximum number of agent iterations (unlimited by default)',
      (value) => parseInt(value, 10)
    )
    .option(
      '--model <model>',
      'Claude model to use',
      DEFAULT_MODEL
    )
    .parse();

  const options = program.opts();

  return {
    projectDir: options.projectDir as string,
    maxIterations: options.maxIterations as number | undefined,
    model: options.model as string,
  };
}

/**
 * Resolve the project directory path
 *
 * Relative paths are placed under the generations/ directory
 * Absolute paths are used as-is
 */
async function resolveProjectDir(projectDir: string): Promise<string> {
  if (isAbsolute(projectDir)) {
    return projectDir;
  }

  // Place relative paths under generations/
  const generationsPath = resolve(process.cwd(), GENERATIONS_DIR);

  // Ensure generations directory exists
  await mkdir(generationsPath, { recursive: true });

  // If projectDir already starts with generations/, use as-is
  if (projectDir.startsWith(GENERATIONS_DIR)) {
    return resolve(process.cwd(), projectDir);
  }

  // Otherwise, nest under generations/
  return join(generationsPath, projectDir);
}

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown(): void {
  let isShuttingDown = false;

  const shutdown = (signal: string) => {
    if (isShuttingDown) {
      console.log('\nForce quitting...');
      process.exit(1);
    }

    isShuttingDown = true;
    console.log(`\n\nReceived ${signal}. Gracefully shutting down...`);
    console.log('Progress has been saved. Run the same command to resume.');
    console.log();

    // Give a short delay before exiting
    setTimeout(() => {
      process.exit(0);
    }, 100);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    printError('ANTHROPIC_API_KEY environment variable is required');
    console.log('\nSet your API key:');
    console.log('  export ANTHROPIC_API_KEY=your-api-key');
    console.log('\nOr run with:');
    console.log('  ANTHROPIC_API_KEY=your-api-key npm run dev -- --project-dir ./my_project');
    process.exit(1);
  }

  // Parse arguments
  const args = parseArgs();

  // Resolve project directory
  const projectDir = await resolveProjectDir(args.projectDir);

  // Setup graceful shutdown
  setupGracefulShutdown();

  // Print startup info
  console.log();
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         AUTONOMOUS CODING AGENT - TypeScript Edition       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  printInfo(`Project directory: ${projectDir}`);
  printInfo(`Model: ${args.model}`);
  if (args.maxIterations) {
    printInfo(`Max iterations: ${args.maxIterations}`);
  }
  console.log();

  try {
    // Run the autonomous agent
    await runAutonomousAgent({
      projectDir,
      model: args.model,
      maxIterations: args.maxIterations,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('SIGINT')) {
      // Graceful shutdown, already handled
      return;
    }

    printError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
