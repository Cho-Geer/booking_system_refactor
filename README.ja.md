# booking_system_refactor

> Booking System — NestJS 11 + Angular 21 monorepo

本リポジトリは、**リファクタリング版の Booking システム monorepo** です。
以下の要素を含みます:

- **`booking-backend/`** — NestJS 11 バックエンド(Prisma ORM + BullMQ)
- **`booking-frontend/`** — Angular 21 SPA(PrimeNG、NgRx Signals、Vitest)
- **`e2e/`** — Playwright E2E テスト
- **`contracts/contract.yaml`** — API 契約(現在 v1.10.0)
- **13 個の GitHub Actions workflow**(CI/CD、keystone 検証、オーケストレーション)

---

## 📌 プロジェクト状態

| 項目 | 状態 |
| --- | --- |
| **進行中リファクタ** | Phase 4(API 統合)+ Phase 5(Responsive/Mobile)レビュー中 |
| **API 契約** | v1.10.0(`contracts/contract.yaml`) |
| **品質ゲート成果物** | `REVIEW_REPORT.md`、`TECH_DEBT_REGISTRY.md`(追跡中) |
| **デフォルトブランチ** | `main` |

本リポジトリは**進行中のリファクタ**です。アーキテクチャ(NestJS バックエンド、
Angular フロントエンド、API 契約、CI マトリクス)は整備済みで、各フェーズがレビューと
改善を重ねています。最新のレビュー記録は `REVIEW_REPORT.md`、技術債務は
`TECH_DEBT_REGISTRY.md` を参照。コードベースは動作可能で、各サブディレクトリで
`npm start` を実行すればローカルで起動します。

---

## 🏗 ディレクトリ構成

```
booking_system_refactor/
├── booking-backend/        # NestJS 11 + Prisma + BullMQ
│   ├── src/
│   │   ├── modules/        # 19 modules: admin / appointments / auth / cache / email /
│   │   │                   #   encryption / health / notifications / rate-limiter /
│   │   │                   #   retention / services / stats / time-slots / translations /
│   │   │                   #   users / verification
│   │   ├── common/         # 共通: guards / filters / interceptors / dto / middleware
│   │   └── config/
│   ├── docs/               # auth-design / error-codes / high-concurrency-design
│   ├── prisma/             # schema + migrations
│   └── test/
├── booking-frontend/       # Angular 21 + PrimeNG + NgRx Signals
│   ├── src/app/
│   │   ├── core/           # config / guards / interceptors
│   │   ├── shared/         # 共通コンポーネント / directives / pipes
│   │   └── features/       # feature modules
│   └── docs/               # design-system / risk-assessment-auth-ui
├── e2e/                    # Playwright テスト
├── contracts/
│   └── contract.yaml       # API 契約(v1.10.0)
├── scripts/
│   ├── keystone-cli.js     # state hash 検証
│   ├── orchestrator-task-scheduler.js
│   ├── update-machine-hash.js
│   └── SECURITY-AUDIT-README.md
├── .opencode/state/        # keystone state ファイル(machine.json + state hash)
├── docker-compose.{ci,dev,prod}.yml
├── REVIEW_REPORT.md        # フェーズレビュー記録
├── TECH_DEBT_REGISTRY.md   # 技術債務トラッカー
└── playwright.config.ts    # Playwright 設定
```

---

## ⚙️ 技術スタック

### バックエンド(`booking-backend/`)
- **NestJS 11** + `@nestjs/throttler` + `@nestjs/bullmq`
- **Prisma ORM**(PostgreSQL)
- **BullMQ**(Redis ベースキュー)
- **JWT 認証** + role-based / permission-based guards
- **CLS**(Continuation Local Storage)で request context 管理
- **Jest**(unit + integration + e2e)+ Stryker(変異テスト)+ k6(性能テスト)
- **commitlint**(conventional commits)+ **Husky**(pre-commit hooks)

### フロントエンド(`booking-frontend/`)
- **Angular 21.2** standalone components
- **PrimeNG 21** + **Chart.js** + **date-fns** + **lodash-es**
- **NgRx Signals 21** で状態管理
- 関数型 HTTP interceptor で `snake_case ↔ camelCase` 変換
- **Vitest** でユニットテスト
- **Glassmorphism デザインシステム**(`docs/design-system.md` 参照)

### CI/CD
- 13 個の GitHub Actions workflow:
  - `backend-ci.yml`、`frontend-ci.yml`、`e2e-ci.yml`
  - `keystone-contract-check.yml`
  - `arbiter-waiver.yml`、`cascade-close.yml`(workflow 自動化)
  - `test-gates.yml`(28KB — 総合テストオーケストレーション)
  - `orchestrator.yml`、`ci-cd-agent-workflow.yml`、`task-template.yml`
  - `reusable-deploy.yml`、`reusable-test.yml`
  - `lint-test.yml`、`framework-ci.yml`

---

## 🚀 クイックスタート

```bash
# バックエンド
cd booking-backend
npm install
npm run prisma:migrate:dev
npm run start:dev            # http://localhost:3000

# フロントエンド(別シェル)
cd booking-frontend
npm install
npm start                    # http://localhost:4200

# E2E
cd ..
npm run test:e2e:all
```

---

## 🧪 品質ゲート

```bash
# バックエンド
cd booking-backend
npm run test                 # Unit (Jest)
npm run test:integration     # Integration (Testcontainers)
npm run test:mutation        # Stryker 変異テスト
npm run test:performance     # k6 負荷テスト

# フロントエンド
cd booking-frontend
npm test                     # Unit (Vitest)
npm run test:audit-coverage  # カバレッジ監査
```

CI は上記すべてを `test-gates.yml` でマージ前に実行します。

---

## 📜 API 契約

API 契約は唯一の情報源:**`contracts/contract.yaml`**(v1.10.0)。
契約は `keystone-contract-check.yml` で PR ごとに検証されます。
wire format は `snake_case`、TypeScript DTO は `camelCase` — 変換は
`booking-frontend/src/app/core/interceptors/api-transform.interceptor.ts` で行います。

---

## ⚠️ 未解決項目

未解決項目は `REVIEW_REPORT.md` と `TECH_DEBT_REGISTRY.md` を参照。
本コードベースは継続的に改善中。一部のテストスイートと DTO 整合は
Phase 4 / Phase 5 の作業として進行中です。

---

## 🔗 関連

- [opencode_framework](https://github.com/Cho-Geer/opencode_framework) — 本プロジェクトの開発に使った Agent フレームワーク
- [qoderwork](https://github.com/Cho-Geer/qoderwork) — 個人ワークスペース

---

## 📄 ライセンス

`package.json` に `"license": "ISC"` が記載されていますが、本レベルに LICENSE ファイルはありません。
デフォルトで**閲覧のみ**可。再配布・改変は事前連絡 (Issue) を必要とします。

---

## 🇬🇧 English

- [English version](./README.md)
