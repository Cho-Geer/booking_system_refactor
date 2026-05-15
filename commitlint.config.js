/**
 * commitlint configuration — enforces Conventional Commits + TDD tags
 *
 * TDD Commit Format:
 *   [Red] T{task_id} description
 *   [Green] T{task_id} description
 *   [Refactor] T{task_id} description
 *
 * Standard commits also allowed for non-TDD work:
 *   feat(scope): description
 *   fix(scope): description
 *   etc.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // New feature
      'fix',      // Bug fix
      'docs',     // Documentation
      'style',    // Formatting (no logic change)
      'refactor', // Code restructuring
      'perf',     // Performance
      'test',     // Tests
      'chore',    // Build/tooling
      'ci',       // CI pipeline
      'build',    // Build system
      'revert',   // Rollback
      'Red',      // TDD Red phase
      'Green',    // TDD Green phase
      'Refactor', // TDD Refactor phase
    ]],
    'type-case': [2, 'always', ['lower-case', 'pascal-case']],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'subject-empty': [2, 'never'],
    'subject-min-length': [2, 'always', 8],
    'header-max-length': [2, 'always', 100],
  },
  plugins: [
    {
      rules: {
        'tdd-tag-consistency': (parsed) => {
          const { type, subject } = parsed;
          // Skip non-TDD types
          if (!['Red', 'Green', 'Refactor'].includes(type)) {
            return [true];
          }
          // Check TDD tag format: [Red] T{number} description
          const tddPattern = /^T\d+\s+/;
          if (!tddPattern.test(subject)) {
            return [false, `TDD commits must start with T{task_id}. Got: "${subject}"`];
          }
          return [true];
        },
      },
    },
  ],
};
