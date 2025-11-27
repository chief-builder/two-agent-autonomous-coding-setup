# Two-Agent Autonomous Coding Setup

A TypeScript implementation of the [Anthropic Autonomous Coding Quickstart](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding), demonstrating extended autonomous coding using the Claude Agent SDK.

## Overview

This project implements a **two-agent pattern** for building complete applications across multiple sessions:

1. **Initializer Agent (Session 1)**: Reads the app specification, creates a comprehensive `feature_list.json` with 200+ test cases, sets up the project structure, and initializes git.

2. **Coding Agent (Sessions 2+)**: Picks up where the previous session left off, implements features one by one, tests them through browser automation, and marks them as passing.

## Prerequisites

- Node.js 18+
- npm or yarn
- Claude Code CLI installed globally: `npm install -g @anthropic-ai/claude-code`
- `ANTHROPIC_API_KEY` environment variable set

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd two-agent-autonomous-coding-setup

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Quick Start

```bash
# Set your API key
export ANTHROPIC_API_KEY=your-api-key

# Run with default settings
npm run dev -- --project-dir ./my_project

# Or with built version
npm start -- --project-dir ./my_project
```

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --project-dir <path>` | Project directory for generated application | `./autonomous_demo_project` |
| `-m, --max-iterations <n>` | Maximum number of agent iterations | Unlimited |
| `--model <model>` | Claude model to use | `claude-sonnet-4-5-20250929` |

### Examples

```bash
# Create a new project with custom name
npm run dev -- --project-dir ./task-manager-app

# Limit iterations for testing
npm run dev -- --project-dir ./demo --max-iterations 5

# Use a different model
npm run dev -- --project-dir ./demo --model claude-opus-4-5-20250929
```

## Project Structure

```
two-agent-autonomous-coding-setup/
├── src/
│   ├── index.ts          # Main CLI entry point
│   ├── agent.ts          # Agent session orchestration
│   ├── client.ts         # Claude SDK client configuration
│   ├── security.ts       # Bash command allowlist & validation
│   ├── progress.ts       # Progress tracking utilities
│   ├── prompts.ts        # Prompt loading utilities
│   └── types.ts          # TypeScript type definitions
├── prompts/
│   ├── app_spec.txt      # Application specification
│   ├── initializer_prompt.md  # First session prompt
│   └── coding_prompt.md  # Continuation session prompt
├── package.json
├── tsconfig.json
└── README.md
```

## How It Works

### Session Management

Each session runs with a fresh context window. Progress persists through:
- `feature_list.json` - Source of truth for feature completion
- Git commits - Code changes are committed after each feature
- `claude-progress.txt` - Session notes and next priorities

### Generated Project Structure

After running, your project directory will contain:

```
my_project/
├── feature_list.json      # Test cases and completion status
├── app_spec.txt           # Copied specification
├── init.sh                # Environment setup script
├── claude-progress.txt    # Session progress notes
├── .claude_settings.json  # Security settings
└── [application files]    # Your generated application
```

### Security Model

The security module implements a defense-in-depth approach:

1. **Command Allowlist**: Only specific bash commands are permitted
2. **Special Validation**: Extra checks for sensitive commands (`pkill`, `chmod`)
3. **Fail-Safe**: Malformed commands are blocked by default

Allowed commands include:
- File inspection: `ls`, `cat`, `head`, `tail`, `grep`
- Node.js: `npm`, `npx`, `node`
- Version control: `git`
- Process management: `ps`, `lsof`, `sleep`, `pkill` (dev processes only)

## Customization

### Change the Application

Edit `prompts/app_spec.txt` to define a different application. The specification should include:
- Technology stack
- Feature requirements
- Database schema
- API endpoints
- UI/UX requirements

### Adjust Feature Count

Edit `prompts/initializer_prompt.md` to change from 200 features. For faster demos, use 20-50 features.

### Modify Allowed Commands

Edit `src/security.ts` and adjust the `ALLOWED_COMMANDS` set.

## Running Generated Applications

After the agent completes:

```bash
cd generations/my_project
./init.sh

# Or manually:
npm install
npm run dev
```

The application typically runs at `http://localhost:3000`.

## Troubleshooting

### Agent appears to hang
This is normal during initialization while generating test cases. Monitor for `[Tool: ...]` output.

### Commands being blocked
The security system is working as intended. Add needed commands to `ALLOWED_COMMANDS` if required.

### API key errors
Ensure `ANTHROPIC_API_KEY` is exported in your shell:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### Resuming interrupted sessions
Simply run the same command again. The agent will detect existing `feature_list.json` and continue where it left off.

## Development

```bash
# Type check
npm run typecheck

# Build
npm run build

# Run in development mode
npm run dev
```

## License

MIT
