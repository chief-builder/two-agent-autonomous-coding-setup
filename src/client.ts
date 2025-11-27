/**
 * Claude SDK client configuration
 *
 * Creates and configures the Claude Agent SDK client with:
 * - Security settings (sandbox, filesystem restrictions, bash hooks)
 * - Enabled tools (Read, Write, Edit, Glob, Grep, Bash, etc.)
 * - System prompt for full-stack developer persona
 */

import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { type Options } from '@anthropic-ai/claude-agent-sdk';
import { validateBashCommand } from './security.js';

/**
 * System prompt for the coding agent
 */
const SYSTEM_PROMPT = `You are an expert full-stack developer building a production-quality web application.

Your goal is to implement features systematically, test them thoroughly using browser automation, and maintain high code quality throughout the development process.

Key principles:
- Write clean, maintainable code following best practices
- Test every feature through the browser UI, not just API calls
- Take screenshots to verify visual appearance
- Commit progress regularly with descriptive messages
- Document your work in claude-progress.txt
- Never remove features from feature_list.json, only update their "passes" status`;

/**
 * Claude settings to be written to the project directory
 */
interface ClaudeSettings {
  sandbox: boolean;
  permissions: {
    allow: string[];
    deny: string[];
  };
}

/**
 * Create the Claude settings file in the project directory
 */
async function writeClaudeSettings(projectDir: string): Promise<void> {
  const settings: ClaudeSettings = {
    sandbox: true,
    permissions: {
      allow: ['./**'],
      deny: [],
    },
  };

  const settingsPath = join(projectDir, '.claude_settings.json');
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * Create the options for the Claude Agent SDK query
 */
export function createClientOptions(projectDir: string, model: string): Options {
  const absoluteProjectDir = resolve(projectDir);

  return {
    model,
    systemPrompt: SYSTEM_PROMPT,
    cwd: absoluteProjectDir,
    maxTurns: 1000,
    allowedTools: [
      'Read',
      'Write',
      'Edit',
      'Glob',
      'Grep',
      'Bash',
      'Task',
      'TodoRead',
      'TodoWrite',
    ],
    permissionMode: 'acceptEdits',
  };
}

/**
 * Initialize the project directory with required settings
 */
export async function initializeProjectSettings(projectDir: string): Promise<void> {
  await writeClaudeSettings(projectDir);
}

/**
 * Check if a bash command is allowed
 */
export function isBashCommandAllowed(command: string): { allowed: boolean; reason?: string } {
  return validateBashCommand(command);
}
