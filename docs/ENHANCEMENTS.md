# Recommended Enhancements for Two-Agent System

Based on deep research into multi-agent systems, the Compounding Engineering Plugin, and Claude Opus 4.5 best practices.

## 1. Add CLAUDE.md Support

Copy a CLAUDE.md template to generated projects for better agent context:

```typescript
// In agent.ts - copy CLAUDE.md template to project
const claudeMdContent = `
# ${projectName}

## Commands
- \`./init.sh\` - Initialize and start dev server
- \`npm test\` - Run test suite

## Architecture
- Feature list in feature_list.json
- Progress notes in claude-progress.txt

## Workflow
- One feature at a time
- Test via Puppeteer before marking complete
`;
```

## 2. Implement Effort Parameter for Opus 4.5

When SDK supports it, add effort parameter for dynamic reasoning control:

```typescript
export function createClientOptions(
  projectDir: string,
  model: string,
  effort: 'low' | 'medium' | 'high' = 'medium'
): Options {
  return {
    model,
    // ... existing options
    // Add when SDK supports it:
    // effort,
  };
}
```

### Effort Level Guidelines

| Level | Use Case | Token Impact |
|-------|----------|--------------|
| Low | Interactive chat, simple tasks | Fastest, cheapest |
| Medium | Balanced (matches Sonnet at 76% fewer tokens) | **Recommended** |
| High | Complex reasoning, planning | Maximum capability |

## 3. Add PreToolUse Security Hook

Enhance security with hooks configuration:

```typescript
// Enhanced security with hooks
const hookConfig = {
  hooks: {
    PreToolUse: [{
      matcher: 'Bash',
      command: `node ${join(__dirname, 'validate-command.js')}`
    }]
  }
};
```

## 4. Parallel Subagent Execution for Review

Add a review phase using parallel subagents:

```typescript
// Add a review phase using parallel subagents
async function runParallelReview(projectDir: string): Promise<void> {
  const reviewPrompt = `
    Deploy 3 subagents in parallel:
    1. Security review agent
    2. Performance review agent
    3. Code quality review agent

    Each should analyze the codebase and report findings.
  `;
  // Execute with parallel tool calls
}
```

## 5. Token-Optimized Agent Selection

Use different models for different phases:

```typescript
const agentConfig = {
  initializer: {
    model: 'claude-opus-4-5-20250929',
    effort: 'high',  // Complex planning needs deep reasoning
  },
  coding: {
    model: 'claude-sonnet-4-5-20250929',
    effort: 'medium',  // Balanced for implementation
  },
  review: {
    model: 'claude-haiku-4-5-20250929',  // Cost-effective for review
  }
};
```

## 6. Extended Thinking Configuration

For complex tasks, configure extended thinking:

```typescript
{
  thinking: {
    type: 'enabled',
    budget_tokens: 8000  // Start at 1024, increase as needed
  }
}
```

### Trigger Phrases

| Phrase | Effect |
|--------|--------|
| "think" | Basic extended thinking |
| "think hard" | Increased budget |
| "think harder" | Higher budget |
| "ultrathink" | Maximum allocation |

## 7. Multi-Agent Architecture Pattern

Consider evolving to a multi-agent pattern:

```
┌─────────────────────────────────────────────┐
│           Lead Agent (Opus 4.5)             │
│  - Task decomposition                        │
│  - Subagent spawning                        │
│  - Result aggregation                        │
└──────────────────┬──────────────────────────┘
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Planner  │ │ Coder    │ │ Reviewer │
│ (Sonnet) │ │ (Sonnet) │ │ (Haiku)  │
└──────────┘ └──────────┘ └──────────┘
```

## 8. Scaling Rules (from Anthropic)

| Task Complexity | Agents | Tool Calls |
|-----------------|--------|------------|
| Simple tasks | 1 agent | 3-10 calls |
| Medium tasks | 2-4 subagents | 10-15 each |
| Complex tasks | 10+ subagents | Divided work |

## 9. CLAUDE.md Best Practices

Keep project CLAUDE.md files:
- 100-200 lines maximum
- Hierarchical (global → project → directory)
- Include: commands, architecture, conventions, gotchas

## 10. Cost Optimization

### Model Pricing (per million tokens)

| Model | Input | Output |
|-------|-------|--------|
| Opus 4.5 | $5 | $25 |
| Sonnet 4.5 | ~$3 | ~$15 |
| Haiku 4.5 | ~$0.25 | ~$1.25 |

### Strategy
- Use Haiku for worker subagents (90% capability at 3x savings)
- Reserve Opus for complex orchestration
- Use effort="medium" for 76% token reduction

## Sources

- [Compounding Engineering Plugin](https://github.com/EveryInc/compounding-engineering-plugin)
- [Claude Opus 4.5](https://www.anthropic.com/claude/opus)
- [Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Extended Thinking Tips](https://docs.claude.com/en/docs/build-with-claude/extended-thinking)
- [Effort Parameter](https://platform.claude.com/docs/en/build-with-claude/effort)
