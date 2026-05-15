/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    /* ───────── Agent Scope / Architecture Boundary ───────── */
    {
      name: 'backend-must-not-import-frontend',
      severity: 'error',
      comment: 'CAT4.2: @Coder-BE 禁止导入前端代码。前端类型只能通过 contract.yaml DTO 共享。',
      from: { path: '^(src|test)/' },
      to:   { path: 'booking-frontend' },
    },
    {
      name: 'frontend-must-not-import-backend-src',
      severity: 'error',
      comment: 'CAT4.2: 前端禁止直接导入后端源码。DTO 类型通过 contract.yaml 同步。',
      from: { path: '^(src|app)/' },
      to:   { path: 'booking-backend' },
    },
    {
      name: 'no-cross-feature-imports',
      severity: 'error',
      comment: 'CAT4.3: Feature 模块之间禁止相互导入，强制模块隔离。',
      from: { path: '^src/app/features/([^/]+)/' },
      to:   { path: '^src/app/features/', pathNot: '^src/app/features/$1/' },
    },
    {
      name: 'controller-only-accessed-by-same-module',
      severity: 'error',
      comment: 'CAT4.4: Controller 只能被同模块的 Service 访问。其他模块应通过 Service 层交互。',
      from: { path: '^src/modules/([^/]+)/' },
      to:   { path: '^src/modules/', pathNot: '^src/modules/$1/', path: '\\.controller\\.ts$' },
    },

    /* ───────── Dependency Direction Enforcement ───────── */
    {
      name: 'service-must-not-import-controller',
      severity: 'error',
      comment: 'Service 层禁止导入 Controller 层，违反单向依赖原则。',
      from: { path: '\\.service\\.ts$' },
      to:   { path: '\\.controller\\.ts$' },
    },
    {
      name: 'test-must-not-import-prod-only',
      severity: 'error',
      comment: '测试文件的 import 应与被测模块对齐，禁止导入无关生产模块。',
      from: { path: '\\.spec\\.ts$' },
      to:   { pathNot: ['\\.spec\\.ts$', 'node_modules'] },
      fromNot: { path: '_mock_' },
    },
  ],
  options: {
    // Conditions
    doNotFollow: {
      path: ['node_modules', '.git', 'dist', 'coverage', '.tsbuildinfo'],
    },
    // Include only the source code
    includeOnly: '^(src|app|test)/',
    // TS settings
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    // Enhanced resolution
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'default'],
    },
    // Reporter
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
