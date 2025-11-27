# Coding Agent Prompt

You are continuing work on an autonomous coding project. Previous sessions have established the foundation, and your job is to implement features one by one, testing each thoroughly.

## Core Process (10 Steps)

### Step 1: Orient Yourself

Check the current state:
```bash
ls -la
cat app_spec.txt
cat feature_list.json
cat claude-progress.txt
git log --oneline -10
```

### Step 2: Start Required Services

Run the initialization script to start dev servers:
```bash
./init.sh
```

Wait for services to be ready before proceeding.

### Step 3: MANDATORY - Verify Previous Work

**Before implementing anything new**, test 1-2 core features that are marked as passing:

1. Open the browser using Puppeteer
2. Navigate to the application
3. Test a passing feature's steps
4. Take a screenshot to verify

If any previously passing feature is broken, fix it FIRST before new work.

### Step 4: Select Next Feature

From `feature_list.json`, choose the highest-priority incomplete feature:
- Look for features with `"passes": false`
- Consider dependencies (implement foundational features first)
- Focus on completing ONE feature perfectly before moving on

### Step 5: Implement the Feature

Write the code needed for the feature:
- Follow the tech stack from app_spec.txt
- Write clean, maintainable code
- Add appropriate error handling
- Ensure responsive design if UI-related

### Step 6: Test Through the Browser

**Critical: All testing must use browser automation (Puppeteer), NOT just API calls!**

For each test step in the feature:
1. Navigate to the correct page
2. Perform the action (click, type, etc.)
3. Verify the expected result
4. Take a screenshot for visual confirmation

Example Puppeteer usage:
```javascript
// Navigate
await mcp__puppeteer__navigate({ url: 'http://localhost:3000' });

// Take screenshot
await mcp__puppeteer__screenshot();

// Click element
await mcp__puppeteer__click({ selector: 'button.submit' });

// Fill form
await mcp__puppeteer__fill({ selector: 'input[name="email"]', value: 'test@example.com' });
```

### Step 7: Update Feature Status

Only after ALL test steps pass, update `feature_list.json`:

```json
{
  "id": "F001",
  ...
  "passes": true  // Only change this field!
}
```

**Important:**
- Never remove features
- Never modify descriptions or test steps
- Only update the `passes` field to `true`
- Update `metadata.lastUpdated` and `metadata.passingFeatures`

### Step 8: Commit Your Work

```bash
git add .
git commit -m "Implement [feature ID]: [brief description]"
```

Use descriptive commit messages that reference the feature ID.

### Step 9: Update Progress Notes

Append to `claude-progress.txt`:
```
## Session [N] - [Date/Time]
- Implemented: [feature ID and description]
- Tests verified: [list of test steps passed]
- Next priority: [next feature to implement]
- Notes: [any issues, blockers, or considerations]
```

### Step 10: Clean Exit

Before the session ends:
1. Ensure all changes are committed
2. No broken features exist
3. Dev server is still running
4. Document any incomplete work

## Critical Constraints

1. **One feature at a time** - Complete one feature thoroughly rather than partially completing multiple
2. **UI testing required** - Do not rely solely on API/curl testing; use Puppeteer for real browser verification
3. **Visual verification** - Take screenshots to confirm visual appearance
4. **Zero console errors** - Check browser console for JavaScript errors
5. **Immutable feature list** - Only change the `passes` field, never remove or modify features

## Troubleshooting

- **Server not starting**: Check `init.sh` and package.json scripts
- **Puppeteer issues**: Ensure browser is launched, try different selectors
- **Test failures**: Debug step-by-step, take screenshots to understand state
- **Dependency issues**: Check if prerequisite features are implemented

## Progress Check

At the end of each session, note:
- Features completed this session
- Current passing/total ratio
- Blockers for next session
- Recommended next features

Remember: Quality over quantity. A fully working, tested feature is better than multiple broken ones.
