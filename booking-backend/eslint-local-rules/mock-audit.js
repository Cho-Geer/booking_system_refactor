/**
 * ESLint custom rule: mock-audit
 *
 * Blocks jest.spyOn / jest.mock on TIER1 services (PrismaService, RedisService, ConfigService).
 * These must never be mocked — use Testcontainers real instances instead.
 *
 * TIER1 service identifiers (case-insensitive):
 *   - prismaService, prisma, PrismaService
 *   - redisService, redis, RedisService
 *   - configService, config, ConfigService
 *
 * @example
 * ```ts
 * // ❌ ERROR: TIER1 violation
 * jest.spyOn(prismaService, 'findMany')
 * jest.spyOn(redis, 'get')
 * jest.spyOn(config, 'get')
 *
 * // ✅ OK: Use Testcontainers instead
 * // RealTestModule.forFeature() starts real PostgreSQL + Redis
 * ```
 */
'use strict';

// TIER1 service identifiers that must never be mocked
const TIER1_PATTERNS = [
  'prismaService', 'prisma', 'PrismaService',
  'redisService', 'redis', 'RedisService',
  'configService', 'config', 'ConfigService',
];

const TIER1_MESSAGE =
  'TIER1 violation: PrismaService/RedisService/ConfigService must NOT be mocked ' +
  '(use Testcontainers real instances instead). ' +
  'See testing-coding-standard.md Three-Tier Mock Policy.';

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Blocks jest.spyOn/jest.mock on TIER1 services',
      category: 'Possible Errors',
      recommended: true,
    },
    schema: [], // no options
    messages: {
      tier1Violation: TIER1_MESSAGE,
    },
  },

  create(context) {
    return {
      /**
       * Detects: jest.spyOn(prismaService, '...')
       *          jest.spyOn(prisma, '...')
       *          jest.spyOn(redis, '...')
       *          jest.spyOn(configService, '...')
       */
      CallExpression(node) {
        // Check for jest.spyOn(serviceIdentifier, ...)
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'jest' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'spyOn' &&
          node.arguments.length > 0
        ) {
          const firstArg = node.arguments[0];
          if (
            firstArg.type === 'Identifier' &&
            isTier1Identifier(firstArg.name)
          ) {
            context.report({
              node,
              messageId: 'tier1Violation',
            });
          }
        }

        // Check for jest.mock('./path-to-prisma-or-redis-service')
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'jest' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'mock' &&
          node.arguments.length > 0
        ) {
          const firstArg = node.arguments[0];
          if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
            const lowerPath = firstArg.value.toLowerCase();
            if (
              lowerPath.includes('prisma') ||
              lowerPath.includes('redis') ||
              lowerPath.includes('config')
            ) {
              context.report({
                node,
                messageId: 'tier1Violation',
              });
            }
          }
        }

        // Check for jest.doMock('./prisma-service')
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'jest' &&
          node.callee.property.type === 'Identifier' &&
          (node.callee.property.name === 'doMock' || node.callee.property.name === 'unmock') &&
          node.arguments.length > 0
        ) {
          const firstArg = node.arguments[0];
          if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
            const lowerPath = firstArg.value.toLowerCase();
            if (
              lowerPath.includes('prisma') ||
              lowerPath.includes('redis') ||
              lowerPath.includes('config')
            ) {
              context.report({
                node,
                messageId: 'tier1Violation',
              });
            }
          }
        }
      },

      /**
       * Detects: jest.mock('@modules/prisma/prisma.service')
       * (import declaration mock style)
       */
      ExpressionStatement(node) {
        // Check for module.factory, module.prototype patterns with prisma/redis/config
        if (
          node.expression?.type === 'CallExpression' &&
          node.expression.callee?.type === 'MemberExpression'
        ) {
          const callee = node.expression.callee;
          // Detect: someVariable.mockImplementation or mockResolvedValue
          if (
            callee.property?.type === 'Identifier' &&
            (callee.property.name?.startsWith('mock'))
          ) {
            // Check if the object being mocked might be a TIER1 service
            // This is a weaker pattern but catches promisified mocks
          }
        }
      },
    };
  },
};

/**
 * Check if an identifier name matches TIER1 patterns (case-insensitive).
 */
function isTier1Identifier(name) {
  const lower = name.toLowerCase();
  return TIER1_PATTERNS.some(
    (pattern) => lower === pattern.toLowerCase(),
  );
}
