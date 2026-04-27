import * as fs from 'fs';
import * as path from 'path';

/**
 * TDD RED test for backend coding standard §3.2:
 * Verifies that target test files no longer use the `any` type.
 *
 * This test will fail in RED phase because `any` is still present,
 * and pass in GREEN phase after `any` is replaced with proper types.
 */
describe('Backend coding standard §3.2: No `any` type in batch 2 files', () => {
  const targetFiles = [
    'modules/appointments/appointments.service.spec.ts',
    'modules/appointments/appointments.controller.spec.ts',
    'modules/time-slots/slot-preemption.controller.spec.ts',
    'modules/time-slots/slot-preemption.service.spec.ts',
  ];

  targetFiles.forEach((relativePath) => {
    it(`${relativePath} should not contain \`any\` type annotations`, () => {
      const fullPath = path.join(__dirname, '..', relativePath);
      expect(fs.existsSync(fullPath)).toBe(true);

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const violations: { line: number; text: string; pattern: string }[] = [];

      lines.forEach((line, index) => {
        const trimmed = line.trim();

        // Skip comment-only lines
        if (
          trimmed.startsWith('//') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('/*')
        ) {
          return;
        }

        // Check for `: any` type annotation (variable/parameter declaration)
        // Pattern: identifier followed by `: any`
        if (/\b\w+\s*:\s*any\b/.test(trimmed)) {
          violations.push({
            line: index + 1,
            text: trimmed,
            pattern: ': any',
          });
        }

        // Check for `as any` type assertion
        if (/\bas\s+any\b/.test(trimmed)) {
          violations.push({
            line: index + 1,
            text: trimmed,
            pattern: 'as any',
          });
        }
      });

      // Collect ALL violations before asserting to get a complete picture
      if (violations.length > 0) {
        const violationMessages = violations.map(
          (v) => `  Line ${v.line}: ${v.pattern} → "${v.text}"`,
        );
        throw new Error(
          `Found ${violations.length} \`any\` type usages:\n${violationMessages.join('\n')}`,
        );
      }

      // No violations found - test passes
      expect(violations).toHaveLength(0);
    });
  });
});
