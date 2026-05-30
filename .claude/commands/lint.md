# /lint — Lint and Format All Code

Run linters and formatters across the entire IQueue codebase (Python backend + ML, and TypeScript frontend).

## Python (Backend + ML)

1. Run Ruff linter and auto-fix safe issues:
   ```bash
   ruff check backend/ ml/ scripts/ --fix
   ```

2. Run Black formatter:
   ```bash
   black backend/ ml/ scripts/
   ```

3. Report any remaining Ruff errors that could not be auto-fixed and explain what each one means.

## TypeScript / Next.js (Frontend)

4. Run ESLint:
   ```bash
   cd frontend && npm run lint
   ```

5. Run Prettier formatter:
   ```bash
   npx prettier --write "src/**/*.{ts,tsx,json,css}"
   ```

## Summary

After all tools finish, provide a short summary:
- How many Python files were reformatted
- How many lint errors remain (if any) and which files they are in
- Whether the frontend passed ESLint cleanly

If there are remaining errors that require manual fixes, list them clearly with file paths and line numbers.
