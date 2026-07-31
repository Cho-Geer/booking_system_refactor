# booking_system_refactor

> Booking System — NestJS 11 + Angular 21 monorepo

This repository is the **monorepo for the refactored booking system**.
It contains:

- **`booking-backend/`** — NestJS 11 backend with Prisma ORM and BullMQ queue
- **`booking-frontend/`** — Angular 21 SPA with PrimeNG, NgRx Signals, and Vitest
- **`e2e/`** — Playwright end-to-end tests
- **`contracts/contract.yaml`** — API contract (currently v1.10.0)
- **13 GitHub Actions workflows** for CI/CD, keystone validation, and orchestration

---

## 📌 Project state

| Area | Status |
| --- | --- |
| **Active refinement** | Phase 4 (API Integration) + Phase 5 (Responsive/Mobile) in active review |
| **API contract** | v1.10.0 (`contracts/contract.yaml`) |
| **Quality gate artifacts** | `REVIEW_REPORT.md`, `TECH_DEBT_REGISTRY.md` (tracked) |
| **Default branch** | `main` |

This repository is an **actively worked-on refactor**: the architecture is in place
(NestJS backend, Angular frontend, API contract, CI matrix), with individual phases being
reviewed and iterated. See `REVIEW_REPORT.md` for the current phase review notes and
`TECH_DEBT_REGISTRY.md` for the tracked debt. The codebase is functional — `npm start` in
each subdirectory will run it locally.

---

## 🏗 Layout

```
booking_system_refactor/
├── booking-backend/        # NestJS 11 + Prisma + BullMQ
│   ├── src/
│   │   ├── modules/        # 19 modules: admin / appointments / auth / cache / email /
│   │   │                   #   encryption / health / notifications / rate-limiter /
│   │   │                   #   retention / services / stats / time-slots / translations /
│   │   │                   #   users / verification
│   │   ├── common/         # shared: guards / filters / interceptors / dto / middleware
│   │   └── config/
│   ├── docs/               # auth-design / error-codes / high-concurrency-design
│   ├── prisma/             # schema + migrations
│   └── test/
├── booking-frontend/       # Angular 21 + PrimeNG + NgRx Signals
│   ├── src/app/
│   │   ├── core/           # config / guards / interceptors
│   │   ├── shared/         # shared components / directives / pipes
│   │   └── features/       # feature modules
│   └── docs/               # design-system / risk-assessment-auth-ui
├── e2e/                    # Playwright tests
├── contracts/
│   └── contract.yaml       # API contract (v1.10.0)
├── scripts/
│   ├── keystone-cli.js     # state hash validation
│   ├── orchestrator-task-scheduler.js
│   ├── update-machine-hash.js
│   └── SECURITY-AUDIT-README.md
├── .opencode/state/        # keystone state files (machine.json + state hash)
├── docker-compose.{ci,dev,prod}.yml
├── REVIEW_REPORT.md        # Phase review notes
├── TECH_DEBT_REGISTRY.md   # tracked tech debt
└── playwright.config.ts    # Playwright config
```

---

## ⚙️ Stack

### Backend (`booking-backend/`)
- **NestJS 11** + `@nestjs/throttler` + `@nestjs/bullmq`
- **Prisma ORM** (PostgreSQL)
- **BullMQ** (Redis-based queue)
- **JWT auth** + role-based / permission-based guards
- **CLS** (Continuation Local Storage) for request context
- **Jest** (unit + integration + e2e) + Stryker (mutation) + k6 (performance)
- **commitlint** (conventional commits) + **Husky** (pre-commit hooks)

### Frontend (`booking-frontend/`)
- **Angular 21.2** standalone components
- **PrimeNG 21** + **Chart.js** + **date-fns** + **lodash-es**
- **NgRx Signals 21** for state management
- **Functional HTTP interceptors** for `snake_case ↔ camelCase` transformation
- **Vitest** for unit tests
- **Glassmorphism design system** (see `docs/design-system.md`)

### CI/CD
- 13 GitHub Actions workflows:
  - `backend-ci.yml`, `frontend-ci.yml`, `e2e-ci.yml`
  - `keystone-contract-check.yml`
  - `arbiter-waiver.yml`, `cascade-close.yml` (workflow automation)
  - `test-gates.yml` (28KB — comprehensive test orchestration)
  - `orchestrator.yml`, `ci-cd-agent-workflow.yml`, `task-template.yml`
  - `reusable-deploy.yml`, `reusable-test.yml`
  - `lint-test.yml`, `framework-ci.yml`

---

## 🚀 Quick start

```bash
# Backend
cd booking-backend
npm install
npm run prisma:migrate:dev
npm run start:dev            # http://localhost:3000

# Frontend (in another shell)
cd booking-frontend
npm install
npm start                    # http://localhost:4200

# E2E
cd ..
npm run test:e2e:all
```

---

## 🧪 Quality gates

```bash
# Backend
cd booking-backend
npm run test                 # Unit (Jest)
npm run test:integration     # Integration (Testcontainers)
npm run test:mutation        # Stryker mutation testing
npm run test:performance     # k6 load test

# Frontend
cd booking-frontend
npm test                     # Unit (Vitest)
npm run test:audit-coverage  # Coverage audit
```

CI runs all of these via `test-gates.yml` before merge.

---

## 📜 API contract

The API contract is the source of truth: **`contracts/contract.yaml`** (v1.10.0).
The contract is enforced by `keystone-contract-check.yml` on every PR.
Wire format is `snake_case`; TypeScript DTOs use `camelCase` — transformation happens
in `booking-frontend/src/app/core/interceptors/api-transform.interceptor.ts`.

---

## ⚠️ Open items

See `REVIEW_REPORT.md` and `TECH_DEBT_REGISTRY.md` for the current list of in-progress items.
The codebase is being iterated; some test suites and DTO alignments are currently being
addressed as part of the Phase 4 / Phase 5 work.

---

## 🔗 Related

- [opencode_framework](https://github.com/Cho-Geer/opencode_framework) — the agent framework used to develop this
- [qoderwork](https://github.com/Cho-Geer/qoderwork) — personal workspace

---

## 📄 License

`package.json` declares `"license": "ISC"`, but no LICENSE file is included at this level.
**Read-only access** by default; redistribution or modification requires prior notice (Issue).

---

## 🇯🇵 日本語版

- [日本語版](./README.ja.md)
