import * as fs from 'fs';
import * as path from 'path';

/**
 * B3-BE-RED-B1: 验证目标测试文件中不再包含显式 `any` 类型。
 *
 * 检测规则（TypeScript 编译器可捕获的显式 any 用法）：
 * 1. `: any` — 变量/参数类型声明中的显式 any
 * 2. `as any` — 类型断言中的显式 any
 * 3. `as unknown as any` — 双重类型断言中的显式 any
 *
 * ⚠️ 此测试仅在 RED→GREEN 流程中有效。
 *    RED 阶段：测试期望检测到 any → 预期 FAIL
 *    GREEN 阶段：any 被替换 → 预期 PASS
 *
 * 以下情况不视为违规（不会被此测试标记）：
 * - `jest.Mock` / `jest.Mocked<...>` 泛型参数（是 Jest 类型需要）
 * - `expect.any(Class)` — Jest 匹配器，非类型注解
 * - `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 注释（显示意图）
 */
describe('B3-BE-RED-B1: No explicit any types in batch 1 test files', () => {
  // __dirname = .../booking-backend/src/modules/__tests__
  // projectRoot should be .../booking-backend/ (root of the project)
  const projectRoot = path.resolve(__dirname, '../../../');
  const targetFiles = [
    'src/modules/auth/auth.service.spec.ts',
    'src/modules/auth/auth.service.redis.spec.ts',
    'src/modules/users/users.controller.spec.ts',
    'src/modules/email/email.service.spec.ts',
  ];

  describe.each(targetFiles)('File: %s', (relativePath) => {
    let content: string;

    beforeAll(() => {
      const absolutePath = path.join(projectRoot, relativePath);
      content = fs.readFileSync(absolutePath, 'utf-8');
    });

    it('should have no `: any` type annotations (variable/parameter type declarations)', () => {
      // Match `: any` as a type annotation (not part of jest.Mocked<any> or expect.any)
      // Look for patterns like `: any;`, `: any )`, `: any,`, `: any =`, `: any {`
      const regex = /:\s*any\s*[);,=\n{]/g;
      const matches = content.match(regex) || [];

      // Filter out test patterns that are part of the RED phase's own test infrastructure
      // e.g., the expects in this very file
      const violations = matches.filter((m) => {
        // Skip if this match is inside the no-any-types.spec.ts file itself
        if (relativePath.endsWith('no-any-types.spec.ts')) {
          return false;
        }
        return true;
      });

      expect(violations).toHaveLength(0);
    });

    it('should have no `as any` type assertions', () => {
      // Match `as any` type assertions but not `as any[` (array access) or `jest.Mocked<any>`
      const regex = /as\s+any\b(?!\s*[\[>])/g;
      const matches = content.match(regex) || [];

      // Filter out matches from exclude patterns or inline comments
      const violations = matches.filter((m) => {
        return true;
      });

      expect(violations).toHaveLength(0);
    });

    it('should have no `as unknown as any` double assertions', () => {
      const regex = /as\s+unknown\s+as\s+any/g;
      const matches = content.match(regex) || [];
      expect(matches).toHaveLength(0);
    });

    it('should have no parameter or callback with `any` type', () => {
      // Match function parameters typed as any: `(tx: any)`, `(payload: any,`
      const regex = /\(\s*\w+\s*:\s*any\s*[,)]/g;
      const matches = content.match(regex) || [];
      expect(matches).toHaveLength(0);
    });
  });
});
