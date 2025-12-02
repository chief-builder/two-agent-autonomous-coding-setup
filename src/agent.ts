/**
 * Agent session logic for the autonomous coding agent
 *
 * Implements the two-agent pattern:
 * 1. Initializer Agent (Session 1): Creates feature_list.json with test cases
 * 2. Coding Agent (Sessions 2+): Implements features and marks them as passing
 */

import { mkdir, copyFile, access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { createClientOptions, initializeProjectSettings, isBashCommandAllowed } from './client.js';
import {
  printSessionHeader,
  printProgressSummary,
  printDelayCountdown,
  printCompletionMessage,
  printInfo,
  printWarning,
  countPassingTests,
} from './progress.js';
import {
  loadInitializerPrompt,
  loadCodingPrompt,
  loadEnhancerPrompt,
  getPromptPath,
} from './prompts.js';
import type { AgentConfig, SessionResult } from './types.js';

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
  red: '\x1b[31m',
};

/**
 * Check if a file or directory exists
 */
async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file contains pending work (not marked as COMPLETED or FIXED)
 */
async function hasPendingWork(filePath: string): Promise<boolean> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const upperContent = content.toUpperCase();

    // Check if the file is marked as completed/fixed
    if (upperContent.includes('STATUS: COMPLETED') ||
        upperContent.includes('STATUS: FIXED') ||
        upperContent.includes('✓ COMPLETED') ||
        upperContent.includes('✓ FIXED')) {
      return false; // No pending work
    }

    // File exists and is not marked complete - there's pending work
    return true;
  } catch {
    return false; // File doesn't exist
  }
}

/**
 * Check for pending bug reports or feature requests
 */
async function checkPendingWorkFiles(projectDir: string): Promise<{
  hasBugs: boolean;
  hasFeatures: boolean;
  bugFile?: string;
  featureFile?: string;
}> {
  const bugFiles = ['BUG_REPORT.md', 'BUGS.md'];
  const featureFiles = ['FEATURE_REQUEST.md', 'FEATURES.md'];

  let hasBugs = false;
  let hasFeatures = false;
  let bugFile: string | undefined;
  let featureFile: string | undefined;

  for (const file of bugFiles) {
    const filePath = join(projectDir, file);
    if (await hasPendingWork(filePath)) {
      hasBugs = true;
      bugFile = file;
      break;
    }
  }

  for (const file of featureFiles) {
    const filePath = join(projectDir, file);
    if (await hasPendingWork(filePath)) {
      hasFeatures = true;
      featureFile = file;
      break;
    }
  }

  return { hasBugs, hasFeatures, bugFile, featureFile };
}

/**
 * Process SDK messages and display them
 */
function processMessage(message: SDKMessage): void {
  switch (message.type) {
    case 'assistant': {
      // Handle assistant messages
      for (const block of message.message.content) {
        if (block.type === 'text') {
          console.log(block.text);
        } else if (block.type === 'tool_use') {
          // Display tool usage
          const toolName = block.name;
          console.log(`${colors.dim}[Tool: ${toolName}]${colors.reset}`);

          // Check bash commands for security
          if (toolName === 'Bash' && typeof block.input === 'object' && block.input !== null) {
            const input = block.input as { command?: string };
            if (input.command) {
              const securityCheck = isBashCommandAllowed(input.command);
              if (!securityCheck.allowed) {
                console.log(`${colors.red}[BLOCKED] ${securityCheck.reason}${colors.reset}`);
              }
            }
          }
        }
      }
      break;
    }
    case 'user': {
      // Handle tool results - check for errors
      for (const block of message.message.content) {
        if (typeof block === 'object' && 'type' in block && block.type === 'tool_result') {
          const toolResult = block as { is_error?: boolean };
          if (toolResult.is_error) {
            console.log(`${colors.red}[Tool Error]${colors.reset}`);
          }
        }
      }
      break;
    }
    case 'system': {
      // System messages (init, status, etc.)
      if (message.subtype === 'init') {
        console.log(`${colors.dim}[Session initialized: ${message.model}]${colors.reset}`);
      }
      break;
    }
    case 'result': {
      // Session result
      if (message.is_error) {
        console.log(`${colors.red}[Session ended with error]${colors.reset}`);
      }
      break;
    }
    case 'tool_progress': {
      // Tool progress updates
      console.log(`${colors.dim}[${message.tool_name}: ${message.elapsed_time_seconds.toFixed(1)}s]${colors.reset}`);
      break;
    }
  }
}

/**
 * Run a single agent session
 *
 * Sends a prompt to Claude and processes the streaming response.
 * Returns a status indicating whether to continue or stop.
 */
async function runAgentSession(
  prompt: string,
  projectDir: string,
  model: string
): Promise<SessionResult> {
  const options = createClientOptions(projectDir, model);

  try {
    // Execute the query and process streaming messages
    for await (const message of query({ prompt, options })) {
      processMessage(message);

      // Check if this is a result message
      if (message.type === 'result') {
        if (message.is_error) {
          return {
            shouldContinue: false,
            error: message.subtype === 'success' ? undefined : message.errors?.join(', '),
          };
        }
        return { shouldContinue: true };
      }
    }

    return { shouldContinue: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      shouldContinue: false,
      error: errorMessage,
    };
  }
}

/**
 * Initialize a new project
 *
 * Creates the project directory, copies the app spec, and sets up settings.
 */
async function initializeProject(projectDir: string, customSpecFile?: string): Promise<void> {
  // Create project directory if it doesn't exist
  await mkdir(projectDir, { recursive: true });

  // Determine the source for app_spec.txt
  const appSpecSource = customSpecFile || getPromptPath('app_spec.txt');
  const appSpecDest = join(projectDir, 'app_spec.txt');

  if (await exists(appSpecSource)) {
    await copyFile(appSpecSource, appSpecDest);
    const specName = customSpecFile ? customSpecFile : 'app_spec.txt';
    printInfo(`Copied ${specName} to ${projectDir}`);
  } else if (customSpecFile) {
    printWarning(`Custom spec file not found: ${customSpecFile}`);
    printInfo('Falling back to default app_spec.txt');
    const defaultSpec = getPromptPath('app_spec.txt');
    if (await exists(defaultSpec)) {
      await copyFile(defaultSpec, appSpecDest);
    }
  }

  // Initialize Claude settings
  await initializeProjectSettings(projectDir);
}

/**
 * Check if this is a first run (no feature_list.json exists)
 */
async function isFirstRun(projectDir: string): Promise<boolean> {
  const featureListPath = join(projectDir, 'feature_list.json');
  return !(await exists(featureListPath));
}

/**
 * Main autonomous agent loop
 *
 * Orchestrates the two-agent pattern:
 * 1. First session: Run initializer agent to create feature list
 * 2. Subsequent sessions: Run coding agent to implement features
 */
export async function runAutonomousAgent(config: AgentConfig): Promise<void> {
  const { projectDir, model, maxIterations, specFile, enhanceMode } = config;
  const absoluteProjectDir = resolve(projectDir);

  let sessionNum = 1;
  let isFirstSession = await isFirstRun(absoluteProjectDir);
  let runEnhancer = false;

  // Handle enhancement mode
  if (enhanceMode) {
    if (isFirstSession) {
      printWarning('Enhancement mode requires an existing project with feature_list.json');
      printInfo('Run without --enhance first to initialize the project');
      return;
    }

    // Copy enhancement spec to project directory
    if (specFile && await exists(specFile)) {
      const enhancementSpecDest = join(absoluteProjectDir, 'enhancement_spec.txt');
      await copyFile(specFile, enhancementSpecDest);
      printInfo(`Copied enhancement spec to ${enhancementSpecDest}`);
      runEnhancer = true;
    } else {
      printWarning('Enhancement mode requires a valid --spec file');
      return;
    }
  }

  // Initialize project on first run (non-enhancement mode)
  if (isFirstSession && !enhanceMode) {
    printInfo('Initializing new project...');
    await initializeProject(absoluteProjectDir, specFile);
  } else if (!enhanceMode) {
    printInfo('Resuming existing project...');
  }

  // Main agent loop
  while (true) {
    // Check iteration limit
    if (maxIterations && sessionNum > maxIterations) {
      printInfo(`Reached maximum iterations (${maxIterations})`);
      break;
    }

    // Check if all tests are passing AND no pending work exists
    const { passing, total } = await countPassingTests(absoluteProjectDir);
    const pendingWork = await checkPendingWorkFiles(absoluteProjectDir);

    if (total > 0 && passing === total) {
      // All tests pass - but check for pending bug reports or feature requests
      if (pendingWork.hasBugs) {
        printInfo(`Found pending bug report: ${pendingWork.bugFile}`);
        printInfo('Running coding agent to fix bugs...');
      } else if (pendingWork.hasFeatures) {
        printInfo(`Found pending feature request: ${pendingWork.featureFile}`);
        printInfo('Running coding agent to add features...');
      } else {
        // Truly complete - no pending work
        printCompletionMessage();
        break;
      }
    }

    // Determine session type
    let sessionType: 'initializer' | 'enhancer' | 'coding';
    if (runEnhancer) {
      sessionType = 'enhancer';
    } else if (isFirstSession && sessionNum === 1) {
      sessionType = 'initializer';
    } else {
      sessionType = 'coding';
    }

    // Print session header
    printSessionHeader(sessionNum, sessionType);

    // Print current progress
    await printProgressSummary(absoluteProjectDir);

    // Load the appropriate prompt
    let prompt: string;

    try {
      if (sessionType === 'enhancer') {
        prompt = await loadEnhancerPrompt();
        printInfo('Running enhancer agent to add features...');
      } else if (sessionType === 'initializer') {
        prompt = await loadInitializerPrompt();
        printInfo('Running initializer agent (this may take 10-20+ minutes)...');
      } else {
        prompt = await loadCodingPrompt();
        printInfo('Running coding agent...');
      }
    } catch (error) {
      printWarning(`Failed to load prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
      break;
    }

    // Run the agent session
    const result = await runAgentSession(prompt, absoluteProjectDir, model);

    if (result.error) {
      printWarning(`Session error: ${result.error}`);
    }

    // Print progress after session
    await printProgressSummary(absoluteProjectDir);

    // Check if we should continue
    if (!result.shouldContinue) {
      printInfo('Agent indicated session complete');
      break;
    }

    // After first session, mark initializer/enhancer as done
    if (sessionType === 'initializer') {
      isFirstSession = false;
    }
    if (sessionType === 'enhancer') {
      runEnhancer = false; // Switch to coding mode for subsequent sessions
    }

    // Increment session counter
    sessionNum++;

    // Delay before next session
    console.log();
    await printDelayCountdown(3);
  }

  printInfo('Autonomous agent session ended');
}
