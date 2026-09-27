---
name: boda-lifecycle-manager
description: >-
  Performs a comprehensive automated review of the Boda platform (React/TS/Firebase). Runs type checking, linting, and validates the production build to ensure the codebase is error-free.
---

# Boda Lifecycle Manager

## Overview
This skill runs automated checks on the Boda freelancer platform. It acts as an automated health checker to verify that no TypeScript errors exist, no linting rules are broken, and the production build completes successfully.

## Dependencies
None.

## Quick Start
To check the project health, ask the agent:
"قم بفحص المشروع والتأكد من عدم وجود أخطاء" or "Run the boda lifecycle manager".

## Workflow

### 1. TypeScript Verification
- Use the `run_command` tool to execute `npx tsc --noEmit` in the project root.
- If errors are found, read the output and suggest fixes.

### 2. Linting (Optional/Auto-fix)
- Use the `run_command` tool to execute `npm run lint` (or `npx eslint . --fix` if you want to auto-fix).
- Report any warnings or errors that require manual intervention.

### 3. Production Build Validation
- Use the `run_command` tool to execute `npm run build`.
- If the build fails, analyze the failure logs and resolve the issues (e.g. missing imports, unused variables causing build failures).

### 4. Summary Report
- Write a short summary to the user outlining what was checked and if any errors were automatically fixed or need their attention.

## Common Mistakes
- Not checking the exit code of `run_command`: always verify that the command completed successfully (code 0).
- Trying to fix everything at once: if the build fails with many errors, focus on resolving the root cause (like a missing interface or a broken path) first.
