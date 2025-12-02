/**
 * Prompt loading utilities for the autonomous coding agent
 *
 * Loads prompt templates from the prompts/ directory
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Prompts directory is at the project root level
const PROMPTS_DIR = join(__dirname, '..', 'prompts');

/**
 * Load a prompt template by name
 *
 * @param name - The name of the prompt file (with or without extension)
 * @returns The prompt content as a string
 */
export async function loadPrompt(name: string): Promise<string> {
  // Try different extensions if none provided
  const extensions = ['', '.md', '.txt'];

  for (const ext of extensions) {
    const filename = name.endsWith('.md') || name.endsWith('.txt') ? name : `${name}${ext}`;
    const filePath = join(PROMPTS_DIR, filename);

    try {
      const content = await readFile(filePath, 'utf-8');
      return content;
    } catch {
      // Try next extension
      continue;
    }
  }

  throw new Error(`Prompt file not found: ${name}`);
}

/**
 * Load the initializer prompt for the first session
 */
export async function loadInitializerPrompt(): Promise<string> {
  return loadPrompt('initializer_prompt.md');
}

/**
 * Load the coding prompt for continuation sessions
 */
export async function loadCodingPrompt(): Promise<string> {
  return loadPrompt('coding_prompt.md');
}

/**
 * Load the enhancer prompt for adding features to existing projects
 */
export async function loadEnhancerPrompt(): Promise<string> {
  return loadPrompt('enhancer_prompt.md');
}

/**
 * Load the application specification
 */
export async function loadAppSpec(): Promise<string> {
  return loadPrompt('app_spec.txt');
}

/**
 * Get the path to the prompts directory
 */
export function getPromptsDir(): string {
  return PROMPTS_DIR;
}

/**
 * Get the path to a specific prompt file
 */
export function getPromptPath(name: string): string {
  return join(PROMPTS_DIR, name);
}
