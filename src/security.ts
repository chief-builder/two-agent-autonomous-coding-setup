/**
 * Security module for bash command allowlist and validation
 *
 * Implements a defense-in-depth approach with:
 * 1. Explicit command allowlist
 * 2. Special validation for sensitive commands (pkill, chmod, init.sh)
 * 3. Fail-safe blocking for malformed commands
 */

import type { SecurityHookResult } from './types.js';

/**
 * Set of allowed bash commands
 */
export const ALLOWED_COMMANDS = new Set([
  // File inspection
  'ls',
  'cat',
  'head',
  'tail',
  'wc',
  'grep',
  'find',
  'tree',

  // File operations
  'cp',
  'mv',
  'mkdir',
  'rm',
  'touch',
  'chmod',

  // Node.js tooling
  'npm',
  'npx',
  'node',

  // Version control
  'git',

  // Process management
  'ps',
  'lsof',
  'sleep',
  'pkill',

  // Shell utilities
  'echo',
  'printf',
  'true',
  'false',
  'test',
  '[',
  'cd',
  'pwd',
  'which',
  'env',
  'export',

  // Text processing
  'sort',
  'uniq',
  'cut',
  'awk',
  'sed',
  'xargs',

  // Archive/compression
  'tar',
  'gzip',
  'gunzip',

  // Network (limited)
  'curl',
]);

/**
 * Allowed process names for pkill command
 */
const ALLOWED_PKILL_TARGETS = new Set([
  'node',
  'npm',
  'npx',
  'vite',
  'next',
]);

/**
 * Allowed chmod patterns
 */
const ALLOWED_CHMOD_PATTERNS = [
  /^\+x$/,
  /^u\+x$/,
  /^a\+x$/,
  /^[0-7]{3,4}$/,
];

/**
 * Split a command string into segments by shell operators
 * Handles &&, ||, ;, and | operators while preserving quoted strings
 */
function segmentCommand(command: string): string[] {
  const segments: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      current += char;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      // Check for operators
      if (command.slice(i, i + 2) === '&&' || command.slice(i, i + 2) === '||') {
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '';
        i++; // Skip next character
        continue;
      }

      if (char === ';' || char === '|') {
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

/**
 * Parse a command segment into tokens
 * Returns the command name and arguments
 */
function parseCommand(segment: string): { command: string; args: string[] } | null {
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < segment.length; i++) {
    const char = segment[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && /\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  // Check for unclosed quotes
  if (inSingleQuote || inDoubleQuote) {
    return null; // Malformed command
  }

  if (tokens.length === 0) {
    return null;
  }

  // Skip environment variable assignments at the start
  let commandIndex = 0;
  while (commandIndex < tokens.length && tokens[commandIndex].includes('=')) {
    commandIndex++;
  }

  if (commandIndex >= tokens.length) {
    return null;
  }

  const command = tokens[commandIndex];
  const args = tokens.slice(commandIndex + 1);

  return { command, args };
}

/**
 * Validate pkill command - only allow killing dev-related processes
 */
function validatePkill(args: string[]): SecurityHookResult {
  // Extract non-flag arguments (process names)
  const processNames = args.filter(arg => !arg.startsWith('-'));

  if (processNames.length === 0) {
    return { allowed: false, reason: 'pkill requires a process name' };
  }

  for (const name of processNames) {
    if (!ALLOWED_PKILL_TARGETS.has(name)) {
      return {
        allowed: false,
        reason: `pkill target '${name}' is not in the allowed list: ${[...ALLOWED_PKILL_TARGETS].join(', ')}`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Validate chmod command - only allow execution permission changes
 */
function validateChmod(args: string[]): SecurityHookResult {
  // Find the mode argument (first non-flag, non-path argument)
  const nonFlagArgs = args.filter(arg => !arg.startsWith('-'));

  if (nonFlagArgs.length < 2) {
    return { allowed: false, reason: 'chmod requires mode and file arguments' };
  }

  const mode = nonFlagArgs[0];

  // Check if mode matches allowed patterns
  const isAllowed = ALLOWED_CHMOD_PATTERNS.some(pattern => pattern.test(mode));

  if (!isAllowed) {
    return {
      allowed: false,
      reason: `chmod mode '${mode}' is not allowed. Use +x, u+x, a+x, or numeric modes`,
    };
  }

  // Check for recursive flag
  if (args.includes('-R') || args.includes('-r') || args.includes('--recursive')) {
    return { allowed: false, reason: 'Recursive chmod is not allowed' };
  }

  return { allowed: true };
}

/**
 * Validate init.sh execution - only allow specific paths
 */
function validateInitSh(fullCommand: string): SecurityHookResult {
  // Only allow ./init.sh or paths ending with /init.sh
  const trimmed = fullCommand.trim();

  if (trimmed === './init.sh' || trimmed.endsWith('/init.sh')) {
    return { allowed: true };
  }

  // Check if it's a bash/sh execution of init.sh
  if (/^(bash|sh)\s+.*init\.sh$/.test(trimmed)) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Only init.sh in project directory is allowed' };
}

/**
 * Main security hook for validating bash commands
 */
export function validateBashCommand(command: string): SecurityHookResult {
  // Handle empty commands
  if (!command.trim()) {
    return { allowed: true };
  }

  try {
    // Segment the command by operators
    const segments = segmentCommand(command);

    for (const segment of segments) {
      const parsed = parseCommand(segment);

      if (!parsed) {
        // Malformed command - fail-safe by blocking
        return { allowed: false, reason: 'Could not parse command (possible unclosed quotes)' };
      }

      const { command: cmd, args } = parsed;

      // Handle path-based command execution
      const baseCommand = cmd.includes('/') ? cmd.split('/').pop()! : cmd;

      // Special case for init.sh
      if (baseCommand === 'init.sh' || segment.includes('init.sh')) {
        const result = validateInitSh(segment);
        if (!result.allowed) {
          return result;
        }
        continue;
      }

      // Check if command is in allowlist
      if (!ALLOWED_COMMANDS.has(baseCommand)) {
        return {
          allowed: false,
          reason: `Command '${baseCommand}' is not in the allowed list`,
        };
      }

      // Special validation for sensitive commands
      if (baseCommand === 'pkill') {
        const result = validatePkill(args);
        if (!result.allowed) {
          return result;
        }
      }

      if (baseCommand === 'chmod') {
        const result = validateChmod(args);
        if (!result.allowed) {
          return result;
        }
      }
    }

    return { allowed: true };
  } catch (error) {
    // Any parsing error should fail-safe by blocking
    return {
      allowed: false,
      reason: `Security check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create a bash security hook function for the Claude SDK
 */
export function createBashSecurityHook(): (command: string) => SecurityHookResult {
  return validateBashCommand;
}
