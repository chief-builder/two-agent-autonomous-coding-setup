# Iterative Feature Enhancement Plan

This document outlines how to enhance the two-agent system to support iterative feature additions to existing projects.

## Current Limitation

The current system has a one-shot initialization model:
1. **Session 1**: Initializer creates `feature_list.json` from `app_spec.txt`
2. **Sessions 2+**: Coding agent implements features until all pass

**Problem**: No mechanism to add NEW features after the initial feature list is created.

---

## Proposed Solution: Two Enhancement Methods

### Method 1: Quick Feature Requests (Ad-hoc)

Similar to `BUG_REPORT.md`, users can create `FEATURE_REQUEST.md` for small additions.

**Workflow:**
1. User creates `FEATURE_REQUEST.md` in project directory
2. Coding agent reads it during orientation (Step 1)
3. Agent adds features to `feature_list.json`
4. Agent implements the requested features
5. Agent marks request as COMPLETED

**Best for:** 1-5 small feature additions

### Method 2: Enhancement Mode (Structured)

A new `--enhance` flag triggers a specialized enhancement session.

**Workflow:**
1. User runs: `npm run dev -- --enhance --spec enhancement_spec.txt`
2. System runs "Enhancer Agent" instead of initializer
3. Enhancer reads existing `feature_list.json`
4. Enhancer reads `enhancement_spec.txt` (new features)
5. Enhancer APPENDS new features (preserving existing ones)
6. Regular coding sessions continue with expanded feature list

**Best for:** Major feature expansions, new modules, significant additions

---

## Prompt Changes Required

### 1. Update `coding_prompt.md` - Add Feature Request Handling

**Location:** Step 1 (Orient Yourself) and new Step 3.6

```markdown
### Step 1: Orient Yourself

Check the current state:
```bash
ls -la
cat app_spec.txt
cat feature_list.json
cat claude-progress.txt
git log --oneline -10

# Check for bug reports and issues
cat BUG_REPORT.md 2>/dev/null || true
cat BUGS.md 2>/dev/null || true

# Check for feature requests  <-- ADD THIS
cat FEATURE_REQUEST.md 2>/dev/null || true
cat FEATURES.md 2>/dev/null || true
```

**Priority Order**:
1. Bug reports (highest - fix broken things first)
2. Feature requests (medium - add requested features)
3. Incomplete features (normal - continue implementation)
```

**New Step 3.6:**

```markdown
### Step 3.6: Process Feature Requests (If Any)

If feature request files exist (FEATURE_REQUEST.md, FEATURES.md), process them:

1. **Read the request carefully** - Understand what's being asked
2. **Generate feature entries** - Create proper feature_list.json entries:
   ```json
   {
     "id": "F0XX",  // Use next available ID
     "category": "functional|style|accessibility|performance",
     "description": "Clear description from request",
     "testSteps": [
       "Step 1: ...",
       "Step 2: ...",
       "Step 3: Verify..."
     ],
     "passes": false
   }
   ```
3. **Update feature_list.json** - Append new features (never remove existing)
4. **Update metadata** - Increment totalFeatures
5. **Mark request as ADDED** in the request file:
   ```markdown
   ## Status: ADDED TO FEATURE LIST ✓

   Added as features: F045, F046, F047
   Total new features: 3
   ```
6. **Implement the features** - Follow normal implementation process
7. **Mark request as COMPLETED** when all features pass
```

---

### 2. Create `enhancer_prompt.md` - For Major Enhancements

New file: `prompts/enhancer_prompt.md`

```markdown
# Enhancer Agent Prompt

You are enhancing an EXISTING autonomous coding project. Your job is to ADD new features to the existing feature list without disrupting completed work.

## Your Responsibilities

### 1. Review Current State

```bash
ls -la
cat app_spec.txt
cat feature_list.json
cat claude-progress.txt
```

Note the current:
- Total features
- Passing features
- Feature ID numbering scheme
- Categories used

### 2. Review Enhancement Specification

Read `enhancement_spec.txt` to understand:
- New features being requested
- How they relate to existing features
- Any dependencies on existing features

### 3. Generate New Feature Entries

Create new features following these rules:

1. **Continue ID numbering** - If last feature is F045, start at F046
2. **Preserve all existing features** - NEVER modify or remove them
3. **Add dependency notes** - Reference existing features if dependent
4. **Match style** - Follow the same description/testSteps format

Example:
```json
{
  "id": "F046",
  "category": "functional",
  "description": "User can export chat history as PDF",
  "dependsOn": ["F012"],  // Optional: references existing feature
  "testSteps": [
    "Step 1: Open a conversation with history",
    "Step 2: Click the export button",
    "Step 3: Select PDF format",
    "Step 4: Verify PDF downloads",
    "Step 5: Open PDF and verify content matches"
  ],
  "passes": false
}
```

### 4. Update feature_list.json

Append new features to the existing array:

```javascript
// Read existing
const existing = JSON.parse(fs.readFileSync('feature_list.json'));

// Add new features
existing.features.push(...newFeatures);

// Update metadata
existing.metadata.totalFeatures = existing.features.length;
existing.metadata.lastUpdated = new Date().toISOString();

// Write back
fs.writeFileSync('feature_list.json', JSON.stringify(existing, null, 2));
```

### 5. Update Progress Notes

Append to `claude-progress.txt`:
```
## Enhancement Session - [Date]
- Added features: F046-F052 (7 new features)
- Enhancement source: enhancement_spec.txt
- New total: 52 features (45 existing + 7 new)
- Dependencies: F046 depends on F012
- Next: Implement F046 (export to PDF)
```

### 6. Commit Enhancement

```bash
git add feature_list.json claude-progress.txt
git commit -m "Add enhancement features F046-F052: [brief description]"
```

## Critical Rules

1. **NEVER remove existing features** - Only append
2. **NEVER modify passing features** - They are validated
3. **NEVER change existing feature IDs** - Breaks references
4. **Preserve existing test results** - Don't reset passes:true to false
5. **Document dependencies** - Note if new features depend on existing

## Output Summary

After completion, report:
1. Features added (IDs and descriptions)
2. Total feature count (before → after)
3. Dependencies identified
4. Recommended implementation order
```

---

### 3. Update `initializer_prompt.md` - Add Enhancement Awareness

Add to the end of the existing prompt:

```markdown
## Note on Enhancements

This initializer creates a NEW project. For adding features to an EXISTING project:

1. **Small additions**: Create `FEATURE_REQUEST.md` in project directory
2. **Major additions**: Use `--enhance` flag with an enhancement spec

The coding agent will handle both scenarios appropriately.
```

---

## Code Changes Required

### 1. `src/index.ts` - Add --enhance flag

```typescript
program
  .option('-e, --enhance', 'Run in enhancement mode (add features to existing project)')
  .option('-s, --spec <file>', 'Path to app spec or enhancement spec file');
```

### 2. `src/agent.ts` - Support enhance mode

```typescript
export async function runAutonomousAgent(config: AgentConfig): Promise<void> {
  const { projectDir, model, maxIterations, specFile, enhanceMode } = config;

  // ...existing code...

  // Determine session type
  let sessionType: 'initializer' | 'enhancer' | 'coding';

  if (enhanceMode) {
    // Enhancement mode - add features to existing project
    if (!await exists(join(absoluteProjectDir, 'feature_list.json'))) {
      printWarning('Cannot enhance: No existing feature_list.json found');
      printInfo('Run without --enhance to initialize the project first');
      return;
    }
    sessionType = 'enhancer';
  } else if (isFirstSession) {
    sessionType = 'initializer';
  } else {
    sessionType = 'coding';
  }
```

### 3. `src/prompts.ts` - Add enhancer prompt loader

```typescript
export async function loadEnhancerPrompt(): Promise<string> {
  const promptPath = getPromptPath('enhancer_prompt.md');
  return readFile(promptPath, 'utf-8');
}
```

### 4. `src/types.ts` - Update AgentConfig

```typescript
export interface AgentConfig {
  projectDir: string;
  model: string;
  maxIterations?: number;
  specFile?: string;
  enhanceMode?: boolean;  // NEW
}
```

---

## Usage Examples

### Example 1: Quick Feature Request

```bash
# In your ChatGPT project directory, create:
cat > FEATURE_REQUEST.md << 'EOF'
# Feature Request: Dark Mode

## Description
Add dark mode support with toggle in settings.

## Requirements
- Dark color scheme (dark gray background, light text)
- Toggle switch in settings panel
- Persist preference in localStorage
- Smooth transition animation

## Priority
Medium
EOF

# Run the agent - it will pick up the request
npm run dev -- my-chatgpt-app
```

### Example 2: Major Enhancement

```bash
# Create enhancement spec
cat > prompts/chatgpt_enhancement_spec.txt << 'EOF'
# ChatGPT Enhancement: Voice Features

Add voice input and text-to-speech capabilities.

## New Features

1. Voice Input
   - Microphone button in input area
   - Speech-to-text conversion
   - Auto-submit option

2. Text-to-Speech
   - Speaker button on AI responses
   - Multiple voice options
   - Speed control

3. Voice Settings
   - Default voice selection
   - Auto-play responses toggle
   - Volume control
EOF

# Run in enhance mode
npm run dev -- my-chatgpt-app --enhance --spec prompts/chatgpt_enhancement_spec.txt
```

---

## Implementation Priority

### Phase 1: Quick Wins (Prompt-only changes)
1. ✅ Update `coding_prompt.md` to read FEATURE_REQUEST.md
2. Add Step 3.6 for processing feature requests

### Phase 2: Full Enhancement Mode
3. Create `enhancer_prompt.md`
4. Update `src/index.ts` with --enhance flag
5. Update `src/agent.ts` with enhance mode logic
6. Update `src/types.ts` with enhanceMode option

### Phase 3: Polish
7. Update README with enhancement documentation
8. Add example enhancement specs
9. Test full workflow with ChatGPT app

---

## Benefits

1. **Iterative Development** - Add features incrementally as requirements evolve
2. **Preserves Progress** - Existing passing features remain untouched
3. **Two Flexibility Levels** - Quick requests vs. structured enhancements
4. **Audit Trail** - Git commits track feature additions over time
5. **User Control** - Clear workflow for managing feature scope
