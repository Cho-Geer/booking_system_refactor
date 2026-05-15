/**
 * commitlint configuration — enforces Conventional Commits + TDD tags
 *
 * TDD Commit Format:
 *   [Red] T{task_id} description
 *   [Green] T{task_id} description
 *   [Refactor] T{task_id} description
 *
 * Standard commits:
 *   feat(scope): description
 *   fix(scope): description
 *   etc.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\[(\w+)\]\s+)?(\w+)(?:\(([^)]*)\))?:\s+(.*)$|^\[(\w+)\]\s+(.*)$/,
      headerCorrespondence: ['_prefix', '_tdd_type', 'type', 'scope', 'subject', 'tdd_type', 'tdd_subject'],
    },
  },
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor', 'perf',
      'test', 'chore', 'ci', 'build', 'revert',
    ]],
    'type-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'subject-empty': [2, 'never'],
    'subject-min-length': [2, 'always', 8],
    'header-max-length': [2, 'always', 100],
  },
  plugins: [
    {
      rules: {
        'tdd-header': (parsed) => {
          const { subject } = parsed;
          if (!subject) return [false, 'Subject is required'];
          return [true];
        },
      },
    },
  ],
};
