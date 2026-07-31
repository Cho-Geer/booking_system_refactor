# booking_system_refactor

> Booking System — NestJS 11 + Angular 21 モノレポ

本リポジトリは **リファクタリング済み予約システムのモノレポ** です。
以下の構成を含みます。

- **`booking-backend/`** — Prisma ORM と BullMQ キューを採用した NestJS 11 バックエンド
- **`booking-frontend/`** — PrimeNG、NgRx Signals、Vitest を採用した Angular 21 SPA
- **`e2e/`** — Playwright によるエンドツーエンドテスト
- **`contracts/contract.yaml`** — API コントラクト(現在 v1.10.0)
- **13 個の GitHub Actions ワークフロー**(CI/CD、キーストーン検証、オーケストレーション用)

---

## 📌 プロジェクト状況

| 項目 | ステータス |
| --- | --- |
| **進行中のリファインメント** | フェーズ 4(API 統合)+ フェーズ 5(レスポンシブ/モバイル)を現在レビュー中 |
| **API コントラクト** | v1.10.0(`contracts/contract.yaml`) |
| **品質ゲートの成果物** | `REVIEW_REPORT.md`、`TECH_DEBT_REGISTRY.md`(追跡管理) |
| **デフォルトブランチ** | `main` |

本リポジトリは **現在進行形でリファクタリング中** のリポジトリです。アーキテクチャ(NestJS バックエンド、Angular フロントエンド、API コントラクト、CI マトリクス)は整っており、各フェーズをレビューしながら反復改善しています。現在のフェーズのレビュー内容は `REVIEW_REPORT.md` を、追跡中の技術的負債は `TECH_DEBT_REGISTRY.md` を参照してください。コードベースは動作可能な状態です。各サブディレクトリで `npm start` を実行すればローカルで起動できます。

---

## 🏗 ディレクトリ構成

```
booking_system_refactor/
├── booking-backend/        # NestJS 11 + Prisma + BullMQ
│   ├── src/
│   │   ├── modules/        # 19 モジュール:admin / appointments / auth / cache / email /
│   │   │                   #   encryption / health / notifications / rate-limiter /
│   │   │                   #   retention / services / stats / time-slots / translations /
│   │   │                   #   users / verification
│   │   ├── common/         # 共通:guards / filters / interceptors / dto / middleware
│   │   └── config/
│   ├── docs/               # auth-design / error-codes / high-concurrency-design
│   ├── prisma/             # スキーマ + マイグレーション
│   └── test/
├── booking-frontend/       # Angular 21 + PrimeNG + NgRx Signals
│   ├── src/app/
│   │   ├── core/           # config / guards / interceptors
│   │   ├── shared/         # 共通コンポーネント / ディレクティブ / パイプ
│   │   └── features/       # 機能モジュール
│   └── docs/               # design-system / risk-assessment-auth-ui
├── e2e/                    # Playwright テスト
├── contracts/
│   └── contract.yaml       # API コントラクト(v1.10.0)
├── scripts/
│   ├── keystone-cli.js     # ステートハッシュ検証
│   ├── orchestrator-task-scheduler.js
│   ├── update-machine-hash.js
│   └── SECURITY-AUDIT-README.md
├── .opencode/state/        # キーストーン状態ファイル(machine.json + state hash)
├── docker-compose.{ci,dev,prod}.yml
├── REVIEW_REPORT.md        # フェーズレビュー記録
├── TECH_DEBT_REGISTRY.md   # 追跡中の技術的負債
└── playwright.config.ts    # Playwright 設定
```

---

## ⚙️ 技術スタック

### バックエンド(`booking-backend/`)
- **NestJS 11** + `@nestjs/throttler` + `@nestjs/bullmq`
- **Prisma ORM**(PostgreSQL)
- **BullMQ**(Redis ベースのキュー)
- **JWT 認証** + ロールベース/権限ベースのガード
- **CLS**(Continuation Local Storage)によるリクエストコンテキスト
- **Jest**(ユニット + 統合 + E2E)+ Stryker(ミューテーション)+ k6(性能)
- **commitlint**(Conventional Commits)+ **Husky**(pre-commit フック)

### フロントエンド(`booking-frontend/`)
- **Angular 21.2** スタンドアロンコンポーネント
- **PrimeNG 21** + **Chart.js** + **date-fns** + **lodash-es**
- **NgRx Signals 21** による状態管理
- `snake_case ↔ camelCase` 変換のための **関数型 HTTP インターセプタ**
- ユニットテスト用 **Vitest**
- **グラスモーフィズム デザインシステム**(`docs/design-system.md` 参照)

### CI/CD
- 13 個の GitHub Actions ワークフロー:
  - `backend-ci.yml`、`frontend-ci.yml`、`e2e-ci.yml`
  - `keystone-contract-check.yml`
  - `arbiter-waiver.yml`、`cascade-close.yml`(ワークフロー自動化)
  - `test-gates.yml`(28KB — 包括的なテストオーケストレーション)
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

# フロントエンド(別のシェルで)
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
npm run test                 # ユニット(Jest)
npm run test:integration     # 統合(Testcontainers)
npm run test:mutation        # Stryker ミューテーションテスト
npm run test:performance     # k6 負荷テスト

# フロントエンド
cd booking-frontend
npm test                     # ユニット(Vitest)
npm run test:audit-coverage  # カバレッジ監査
```

CI はマージ前に `test-gates.yml` を通じてこれらすべてを実行します。

---

## 📜 API コントラクト

API コントラクトは single source of truth です:**`contracts/contract.yaml`**(v1.10.0)。
このコントラクトは PR ごとに `keystone-contract-check.yml` で強制されます。
ワイヤー形式は `snake_case`、TypeScript DTO は `camelCase` で、変換は
`booking-frontend/src/app/core/interceptors/api-transform.interceptor.ts` で行われます。

---

## ⚠️ オープンアイテム

進行中の項目一覧は `REVIEW_REPORT.md` および `TECH_DEBT_REGISTRY.md` を参照してください。
本コードベースは反復開発中であり、一部のテストスイートや DTO 整合はフェーズ 4 / フェーズ 5 の作業として現在対応中です。

---

## 🔗 関連リポジトリ

- [opencode_framework](https://github.com/Cho-Geer/opencode_framework) — 本リポジトリの開発に使用したエージェントフレームワーク
- [qoderwork](https://github.com/Cho-Geer/qoderwork) — 個人ワークスペース

---

## 📄 ライセンス

`package.json` では `"license": "ISC"` と宣言されていますが、本レベルには LICENSE ファイルは含まれていません。
デフォルトは **読み取り専用アクセス** であり、再配布または改変には事前通知(Issue)が必要です。

---

## 🇬🇧 English | 🇨🇳 中文

- [English version](./README.en.md)
- [中文版本](./README.zh.md)