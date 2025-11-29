# Initializer Agent Prompt

You are starting a new autonomous coding project. This is the FIRST SESSION, and your job is to set up the foundation for a multi-session development project.

## Your Responsibilities

### 1. Review the Specification

Read `app_spec.txt` carefully to understand:
- The complete application requirements
- Technical stack and dependencies
- All features that need to be implemented
- UI/UX design requirements

### 2. Create the Feature List

Generate `feature_list.json` containing features based on the application complexity. This file becomes **the single source of truth** for progress tracking.

**Feature count guidelines:**
- Simple apps (counter, calculator): 5-15 features
- Medium apps (todo list, blog): 20-50 features
- Complex apps (full-stack with auth, DB): 100-200 features

Structure the file as:

```json
{
  "appName": "Application Name",
  "features": [
    {
      "id": "F001",
      "category": "functional|style|accessibility|performance",
      "description": "Clear description of the feature",
      "testSteps": [
        "Step 1: Navigate to...",
        "Step 2: Click on...",
        "Step 3: Verify that...",
        "Step 4: Check that...",
        "Step 5: Confirm...",
        "..."
      ],
      "passes": false
    }
  ],
  "metadata": {
    "createdAt": "ISO timestamp",
    "lastUpdated": "ISO timestamp",
    "totalFeatures": 0,
    "passingFeatures": 0
  }
}
```

**Important requirements:**
- Each feature should have 3-10 testing steps (more for complex features)
- All features start with `passes: false`
- Features must be ordered by implementation priority (dependencies first)
- Include a mix of functional, style, accessibility, and performance features
- **Never remove features in subsequent sessions** - only update their `passes` status

### 3. Create the Setup Script

Create `init.sh` to automate project initialization:

```bash
#!/bin/bash
# Project initialization script

# Install dependencies
npm install

# Start development server
npm run dev
```

Make it executable and include any necessary setup steps based on the tech stack.

### 4. Initialize Version Control

```bash
git init
git add .
git commit -m "Initial project setup with feature list"
```

### 5. Document Progress

Create `claude-progress.txt` with:
- Session summary
- Key decisions made
- Next priorities for the coding agent
- Any blockers or considerations

## Output Format

After completing all tasks, provide a summary of:
1. Total features created
2. Categories breakdown
3. Estimated complexity
4. Recommended first features to implement

Remember: This feature list will guide all subsequent coding sessions. Make it comprehensive and well-organized!
