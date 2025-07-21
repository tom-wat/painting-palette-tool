# 絵画パレット抽出ツール - プロジェクトディレクトリ構造

## 推奨ディレクトリ構造

```
painting-palette-tool/
├── docs/                              # 📚 プロジェクトドキュメント
│   ├── planning/                      # 計画・設計文書
│   │   ├── implementation-plan.md     # ← 実装計画書（改訂版）
│   │   ├── task-breakdown.md          # ← 実装タスク分解
│   │   ├── tech-decisions/            # 技術選定の記録
│   │   │   ├── javascript-optimization.md  # ← WASM不要の分析
│   │   │   └── rendering-comparison.md
│   │   └── roadmap.md
│   ├── architecture/                  # アーキテクチャ文書
│   │   ├── system-design.md
│   │   ├── data-flow.md
│   │   └── diagrams/                  # 図表
│   ├── api/                          # API仕様
│   │   ├── rest-api.md
│   │   └── plugin-api.md
│   └── guides/                       # 開発・利用ガイド
│       ├── development.md
│       ├── deployment.md
│       └── user-manual.md
│
├── experiments/                       # 🧪 Phase 0: 技術検証
│   ├── color-extraction/             # 色抽出アルゴリズム検証
│   │   ├── benchmarks/
│   │   ├── k-means-js/
│   │   ├── octree/
│   │   └── README.md
│   ├── rendering/                    # 3D描画検証
│   │   ├── canvas2d/
│   │   ├── webgl/
│   │   ├── threejs/
│   │   └── comparison.md
│   └── optimization/                 # 最適化検証
│       ├── typed-arrays/
│       ├── web-workers/
│       └── sampling-strategies/
│
├── packages/                         # 📦 モノレポパッケージ
│   ├── web/                         # Next.jsアプリケーション
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   └── package.json
│   ├── color-engine/                # 色処理コアライブラリ
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── cube-renderer/               # 3D描画ライブラリ
│   │   ├── src/
│   │   └── package.json
│   └── shared/                      # 共通ユーティリティ
│       ├── types/
│       ├── utils/
│       └── package.json
│
├── scripts/                         # 🔧 開発支援スクリプト
│   ├── setup.sh
│   ├── benchmark.js
│   └── generate-samples.js
│
├── tests/                           # 🧪 統合テスト
│   ├── e2e/
│   ├── integration/
│   └── fixtures/
│
├── .github/                         # GitHub設定
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── deploy.yml
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
│
├── .vscode/                         # VS Code設定
│   ├── settings.json
│   ├── extensions.json
│   └── launch.json
│
├── package.json                     # ルートpackage.json
├── pnpm-workspace.yaml             # pnpmワークスペース設定
├── turbo.json                      # Turborepo設定
├── tsconfig.json                   # TypeScript設定
├── README.md                       # プロジェクトREADME
└── .gitignore
```

## Claude Codeでの作業開始手順

### 1. 初期セットアップコマンド

```bash
# プロジェクトディレクトリ作成
mkdir painting-palette-tool && cd painting-palette-tool

# ドキュメントディレクトリ作成
mkdir -p docs/{planning,architecture,api,guides}
mkdir -p docs/planning/tech-decisions

# 実験用ディレクトリ作成
mkdir -p experiments/{color-extraction,rendering,optimization}

# パッケージディレクトリ作成
mkdir -p packages/{web,color-engine,cube-renderer,shared}

# その他の必要なディレクトリ
mkdir -p scripts tests/{e2e,integration,fixtures}
mkdir -p .github/workflows .vscode

# Git初期化
git init

# 基本ファイル作成
touch README.md .gitignore pnpm-workspace.yaml
```

### 2. ドキュメントの配置

```bash
# 実装計画書を配置
cp implementation-plan-revised.md docs/planning/implementation-plan.md

# タスク分解を配置
cp task-breakdown.md docs/planning/task-breakdown.md

# 技術決定記録を配置
cp wasm-analysis.md docs/planning/tech-decisions/javascript-optimization.md
```

### 3. 初期設定ファイル

#### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
  - 'experiments/*'
```

#### .gitignore

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Production
dist/
build/
.next/
out/

# Misc
.DS_Store
*.log
.env*.local

# IDE
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/

# Temporary
*.tmp
*.temp
.cache/
```

#### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false
    }
  }
}
```

## ディレクトリ構造の利点

### 1. **明確な関心の分離**

- `docs/`: すべてのドキュメント
- `experiments/`: Phase 0の検証コード
- `packages/`: 本番コード
- `tests/`: テストコード

### 2. **モノレポの利点**

- コード共有が容易
- 統一されたビルド・テスト
- 依存関係の一元管理

### 3. **段階的な開発**

- Phase 0: `experiments/`で検証
- Phase 1-3: `packages/`で本番実装
- 検証結果を本番に反映しやすい

### 4. **チーム開発への配慮**

- 明確なディレクトリ構造
- ドキュメントの一元管理
- 開発環境の共有（.vscode）

## Claude Codeでの効率的な作業

### Phase 0開始時

```bash
# 実験環境に移動
cd experiments/color-extraction

# 検証用のパッケージ初期化
pnpm init
pnpm add -D vitest @vitest/ui typescript

# ベンチマーク実行
pnpm vitest bench
```

### Phase 1開始時

```bash
# Web アプリケーションに移動
cd packages/web

# Next.js セットアップ
pnpm create next-app@latest . --typescript --tailwind --app

# 開発サーバー起動
pnpm dev
```

この構造により、Claude Codeで効率的に開発を進められ、ドキュメントと実装が整理された状態を保てます。
