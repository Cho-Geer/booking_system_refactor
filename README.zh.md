# booking_system_refactor

> 预约系统 — NestJS 11 + Angular 21 单仓多包(monorepo)

本仓库是 **重构后预约系统的 monorepo**。
包含以下内容:

- **`booking-backend/`** — 采用 NestJS 11 + Prisma ORM + BullMQ 队列的后端
- **`booking-frontend/`** — 采用 PrimeNG、NgRx Signals 和 Vitest 的 Angular 21 SPA
- **`e2e/`** — Playwright 端到端测试
- **`contracts/contract.yaml`** — API 契约(当前 v1.10.0)
- **13 个 GitHub Actions 工作流**(CI/CD、keystone 校验、编排)

---

## 📌 项目状态

| 领域 | 状态 |
| --- | --- |
| **进行中的优化** | 阶段 4(API 集成)+ 阶段 5(响应式/移动端)正在评审中 |
| **API 契约** | v1.10.0(`contracts/contract.yaml`) |
| **质量门禁产物** | `REVIEW_REPORT.md`、`TECH_DEBT_REGISTRY.md`(已跟踪) |
| **默认分支** | `main` |

本仓库是一个 **持续迭代中的重构项目**:架构已经就位
(NestJS 后端、Angular 前端、API 契约、CI 矩阵),各阶段正在进行评审和迭代。请参阅 `REVIEW_REPORT.md` 了解当前阶段的评审记录,
参阅 `TECH_DEBT_REGISTRY.md` 了解已跟踪的技术债。代码库是可运行的 — 在各子目录下执行 `npm start` 即可本地启动。

---

## 🏗 目录结构

```
booking_system_refactor/
├── booking-backend/        # NestJS 11 + Prisma + BullMQ
│   ├── src/
│   │   ├── modules/        # 19 个模块:admin / appointments / auth / cache / email /
│   │   │                   #   encryption / health / notifications / rate-limiter /
│   │   │                   #   retention / services / stats / time-slots / translations /
│   │   │                   #   users / verification
│   │   ├── common/         # 共享:guards / filters / interceptors / dto / middleware
│   │   └── config/
│   ├── docs/               # auth-design / error-codes / high-concurrency-design
│   ├── prisma/             # schema + migrations
│   └── test/
├── booking-frontend/       # Angular 21 + PrimeNG + NgRx Signals
│   ├── src/app/
│   │   ├── core/           # config / guards / interceptors
│   │   ├── shared/         # 共享组件 / 指令 / 管道
│   │   └── features/       # 功能模块
│   └── docs/               # design-system / risk-assessment-auth-ui
├── e2e/                    # Playwright 测试
├── contracts/
│   └── contract.yaml       # API 契约(v1.10.0)
├── scripts/
│   ├── keystone-cli.js     # state hash 校验
│   ├── orchestrator-task-scheduler.js
│   ├── update-machine-hash.js
│   └── SECURITY-AUDIT-README.md
├── .opencode/state/        # keystone 状态文件(machine.json + state hash)
├── docker-compose.{ci,dev,prod}.yml
├── REVIEW_REPORT.md        # 阶段评审记录
├── TECH_DEBT_REGISTRY.md   # 已跟踪的技术债
└── playwright.config.ts    # Playwright 配置
```

---

## ⚙️ 技术栈

### 后端(`booking-backend/`)
- **NestJS 11** + `@nestjs/throttler` + `@nestjs/bullmq`
- **Prisma ORM**(PostgreSQL)
- **BullMQ**(基于 Redis 的队列)
- **JWT 认证** + 基于角色/权限的守卫
- **CLS**(Continuation Local Storage)用于请求上下文
- **Jest**(单元 + 集成 + E2E)+ Stryker(变异测试)+ k6(性能)
- **commitlint**(Conventional Commits)+ **Husky**(pre-commit 钩子)

### 前端(`booking-frontend/`)
- **Angular 21.2** standalone components
- **PrimeNG 21** + **Chart.js** + **date-fns** + **lodash-es**
- **NgRx Signals 21** 用于状态管理
- 用于 `snake_case ↔ camelCase` 转换的 **函数式 HTTP 拦截器**
- **Vitest** 用于单元测试
- **玻璃拟态设计系统**(参见 `docs/design-system.md`)

### CI/CD
- 13 个 GitHub Actions 工作流:
  - `backend-ci.yml`、`frontend-ci.yml`、`e2e-ci.yml`
  - `keystone-contract-check.yml`
  - `arbiter-waiver.yml`、`cascade-close.yml`(工作流自动化)
  - `test-gates.yml`(28KB — 全面的测试编排)
  - `orchestrator.yml`、`ci-cd-agent-workflow.yml`、`task-template.yml`
  - `reusable-deploy.yml`、`reusable-test.yml`
  - `lint-test.yml`、`framework-ci.yml`

---

## 🚀 快速开始

```bash
# 后端
cd booking-backend
npm install
npm run prisma:migrate:dev
npm run start:dev            # http://localhost:3000

# 前端(在另一个 shell 中)
cd booking-frontend
npm install
npm start                    # http://localhost:4200

# E2E
cd ..
npm run test:e2e:all
```

---

## 🧪 质量门禁

```bash
# 后端
cd booking-backend
npm run test                 # 单元测试(Jest)
npm run test:integration     # 集成测试(Testcontainers)
npm run test:mutation        # Stryker 变异测试
npm run test:performance     # k6 负载测试

# 前端
cd booking-frontend
npm test                     # 单元测试(Vitest)
npm run test:audit-coverage  # 覆盖率审计
```

CI 通过 `test-gates.yml` 在合并前运行以上全部检查。

---

## 📜 API 契约

API 契约是唯一的真相来源:**`contracts/contract.yaml`**(v1.10.0)。
契约由 `keystone-contract-check.yml` 在每个 PR 上强制执行。
线上传输格式为 `snake_case`;TypeScript DTO 使用 `camelCase` — 转换在
`booking-frontend/src/app/core/interceptors/api-transform.interceptor.ts` 中完成。

---

## ⚠️ 待办事项

当前进行中的项目列表请参阅 `REVIEW_REPORT.md` 和 `TECH_DEBT_REGISTRY.md`。
代码库正在迭代中;部分测试套件和 DTO 字段对齐工作正在作为阶段 4 / 阶段 5 的一部分进行处理。

---

## 🔗 相关仓库

- [opencode_framework](https://github.com/Cho-Geer/opencode_framework) — 用于开发本仓库的 agent 框架
- [qoderwork](https://github.com/Cho-Geer/qoderwork) — 个人工作空间

---

## 📄 许可证

`package.json` 声明 `"license": "ISC"`,但本级别未包含 LICENSE 文件。
默认为 **只读访问**;如需再分发或修改,需事先通过 Issue 通知。

---

## 🇯🇵 日本語 | 🇬🇧 English

- [日本語版](./README.md)
- [English version](./README.en.md)