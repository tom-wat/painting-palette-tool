# Claude Code 開発環境ガイド

## プロジェクト概要

絵画支援パレット抽出ツール - 参考画像から絵画制作に最適化された色パレットを抽出し、立方体アイソメトリック図で明暗構造を可視化するツール

## 開発コマンド

### セットアップ

```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev

# 全パッケージのビルド
pnpm build

# テスト実行
pnpm test

# テストカバレッジ
pnpm test:coverage

# E2Eテスト
pnpm test:e2e

# リント実行
pnpm lint

# 型チェック
pnpm typecheck

# ベンチマーク実行
pnpm benchmark
```

### 実験環境（Phase 0）

```bash
# 色抽出アルゴリズム検証
cd experiments/color-extraction
pnpm vitest bench

# 3D描画パフォーマンス検証
cd experiments/rendering
pnpm dev

# 最適化検証
cd experiments/optimization
pnpm test
```

### 本番環境（Phase 1-3）

```bash
# Webアプリ開発
cd packages/web
pnpm dev

# 色処理エンジン開発
cd packages/color-engine
pnpm test:watch

# 3D描画ライブラリ開発
cd packages/cube-renderer
pnpm dev
```

## テスト・ログ環境設定

### テストファイル構造

```
tests/
├── unit/                    # 単体テスト
│   ├── color-extraction/    # 色抽出ロジック
│   ├── cube-rendering/      # 3D描画
│   └── image-processing/    # 画像処理
├── integration/             # 統合テスト
│   ├── color-pipeline/      # 色抽出パイプライン
│   └── export-formats/      # エクスポート機能
├── e2e/                     # E2Eテスト
│   ├── user-workflows/      # ユーザーワークフロー
│   └── cross-browser/       # ブラウザ間テスト
├── benchmarks/              # パフォーマンステスト
│   ├── color-algorithms/    # アルゴリズム性能
│   └── rendering/           # 描画性能
└── fixtures/                # テストデータ
    ├── images/              # サンプル画像
    └── palettes/            # 期待値パレット
```

### ログ設定（vibelogger使用）

```typescript
// lib/logger.ts
import { VibeLogger } from 'vibelogger';

export const logger = new VibeLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  prefix: '[PaletteApp]',
});

// 専用ログメソッド
export const loggers = {
  // パフォーマンス測定ログ
  perf: (operation: string, duration: number) => {
    logger.perf(`${operation}: ${duration}ms`);
  },

  // 色抽出専用ログ
  colorExtraction: (colors: number, duration: number, algorithm: string) => {
    logger.info(
      `${colors} colors extracted in ${duration}ms using ${algorithm}`
    );
  },

  // 2D描画専用ログ
  rendering: (method: string, renderTime: number) => {
    logger.info(`${method} rendering: ${renderTime}ms`);
  },

  // タスク完了ログ
  taskComplete: (taskName: string, duration: number) => {
    logger.success(`Task completed: ${taskName} (${duration}ms)`);
  },
};
```

### パフォーマンス測定ユーティリティ

```typescript
// lib/benchmark.ts
export class PerformanceTracker {
  private marks: Map<string, number> = new Map();

  start(name: string) {
    this.marks.set(name, performance.now());
  }

  end(name: string): number {
    const start = this.marks.get(name);
    if (!start) throw new Error(`No start mark for ${name}`);

    const duration = performance.now() - start;
    loggers.perf(name, duration);
    this.marks.delete(name);

    return duration;
  }

  // 色抽出専用メソッド
  async trackColorExtraction<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    this.start(name);
    const result = await operation();
    const duration = this.end(name);

    return { result, duration };
  }
}

export const perf = new PerformanceTracker();
```

### テスト実行時のログ設定

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    },
    benchmark: {
      include: ['**/*.bench.ts'],
      reporters: ['verbose'],
    },
  },
});

// tests/setup.ts
import { logger } from '../lib/logger';

// テスト時はログを制御
global.beforeEach(() => {
  if (process.env.TEST_VERBOSE !== 'true') {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  }
});
```

## UIデザイン要件

**【重要】白黒・ミニマルデザイン必須**

- カラーテーマやアクセント色は使用しない
- 白・黒・グレーのみでインターフェース構築
- 最小限のUIコンポーネントでシンプルな構成
- 機能性重視、装飾的要素は排除

## 開発フロー

### Phase 0: 技術検証

1. `experiments/`でアルゴリズム検証
2. ベンチマークでパフォーマンス測定
3. 結果をドキュメント化

### Phase 1: MVP開発

1. `packages/web`でUI開発
2. `packages/color-engine`でコア機能
3. 単体・統合テストを並行実行

### Phase 2: 機能拡張

1. 新機能の単体テスト先行
2. E2Eテストでワークフロー検証
3. パフォーマンス回帰テスト

### Phase 3: 最適化

1. ベンチマークで現状測定
2. 最適化実装
3. 改善効果の検証

## トラブルシューティング

### よくある問題

```bash
# 型エラーが出る場合
pnpm typecheck

# テストが失敗する場合
pnpm test -- --reporter=verbose

# パフォーマンスが遅い場合
pnpm benchmark

# ビルドが失敗する場合
pnpm clean && pnpm build
```

### デバッグ方法

```typescript
// デバッグ用の環境変数
// .env.local
NODE_ENV = development;
DEBUG = true;
TEST_VERBOSE = true;
BENCHMARK_ENABLED = true;

// コード内でのデバッグ
import { logger, perf } from '../lib';

// 色抽出のデバッグ
perf.start('color-extraction');
const colors = await extractColors(imageData);
perf.end('color-extraction');
loggers.colorExtraction(colors.length, perf.get('color-extraction'), 'k-means');

// 3D描画のデバッグ
const renderStart = performance.now();
renderCube(colors);
const renderTime = performance.now() - renderStart;
loggers.rendering('Canvas2D', renderTime);
```

## 継続的な品質管理

### 自動化されたチェック

- **pre-commit**: lint + typecheck + 簡単なテスト
- **PR作成時**: 全テスト + E2E + パフォーマンステスト
- **main merge時**: デプロイ + スモークテスト

### 監視指標

- **色抽出精度**: テスト画像での期待値との一致率
- **処理速度**: 各処理段階の実行時間
- **メモリ使用量**: 大容量画像での使用量
- **描画性能**: FPS、レンダリング時間

この環境により、安定した開発とデバッグが可能になります。

## タスク完了時の必須フロー

### 1. 実装完了後の必須チェック

```bash
# 全て並行実行でタスク完了を確認
pnpm typecheck && pnpm lint && pnpm test
```

### 2. タスク完了ログのフォーマット

```typescript
// lib/task-logger.ts
export interface TaskCompletionLog {
  taskId: string;
  taskName: string;
  completedAt: string;
  testResults: {
    typecheck: 'pass' | 'fail';
    lint: 'pass' | 'fail';
    test: 'pass' | 'fail';
    coverage?: string;
  };
  performanceMetrics?: {
    buildTime: number;
    testTime: number;
  };
  notes?: string;
}

export const logTaskCompletion = (log: TaskCompletionLog) => {
  console.log(`[TASK-COMPLETE] ${log.taskName}`);
  console.log(`  ✓ TypeCheck: ${log.testResults.typecheck}`);
  console.log(`  ✓ Lint: ${log.testResults.lint}`);
  console.log(`  ✓ Tests: ${log.testResults.test}`);
  if (log.testResults.coverage) {
    console.log(`  ✓ Coverage: ${log.testResults.coverage}`);
  }
  console.log(`  📅 Completed: ${log.completedAt}`);
  if (log.notes) {
    console.log(`  📝 Notes: ${log.notes}`);
  }
};
```

### 3. 必須ルール

**タスク完了時は必ず以下を実行:**

1. `pnpm typecheck` - 型安全性確認
2. `pnpm lint` - コード品質確認
3. `pnpm test` - 機能動作確認
4. 完了ログを記録（上記フォーマット使用）
5. TodoWriteツールで該当タスクを"completed"に更新

**失敗時の対応:**

- テスト失敗時は問題を修正してから完了扱い
- 部分実装の場合は"in_progress"のまま継続
- ブロッカーがある場合は新しいタスクとして追加

### 4. パフォーマンス要件

- TypeCheck: 5秒以内
- Lint: 3秒以内
- Test: 30秒以内（単体テストのみの場合）
- 超過時は最適化タスクを作成
