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

### テストファイル構造（実態）

テストはルート `tests/` ではなく、**各パッケージの `src/` 配下にテスト対象と同居**させる方式を採用している（`*.test.ts`）。ルートの `tests/`(`e2e/` `integration/` `fixtures/`)は現状空ディレクトリで、実体を持たない。

```
packages/
├── color-engine/src/
│   ├── color-space.test.ts
│   ├── color-conversions.test.ts
│   ├── sampling.test.ts
│   └── extraction.test.ts
├── cube-renderer/src/
│   └── renderer.test.ts
└── web/src/lib/
    ├── export-formats.test.ts
    ├── selection-tools.test.ts
    ├── brightness-analysis.test.ts
    └── palette-storage.test.ts
```

- 実行は各パッケージの `pnpm test`(vitest、CIモード = `vitest run`)。ウォッチモードは `pnpm test:watch`。
- `packages/web` は `vitest.config.ts` で `environment: 'jsdom'` を指定し、`vitest.setup.ts` で `ImageData` の最小ポリフィルを提供している(jsdomが未実装のため)。
- E2E は `packages/web/e2e/`(Playwright、`playwright.config.ts` は `packages/web` 直下)。`pnpm --filter @palette-tool/web test:e2e` または root `pnpm test:e2e` で実行(`pnpm dev` を webServer として自動起動)。フィクスチャ画像は `packages/web/e2e/fixtures/`。
- ルート `tests/`(`integration/` `fixtures/`)と `benchmarks` は未実装。導入する場合はこの節を実装内容に合わせて更新すること。

### ログ設定(vibelogger使用)— 設計例(未実装)

以下のログ/ベンチマークユーティリティ(`lib/logger.ts` `lib/benchmark.ts` `lib/task-logger.ts` 等)は**設計時のサンプルコードであり、実際にはリポジトリに存在しない**。実装する場合はこの節を参考にしつつ、実際のファイルパスと合わせて更新すること。

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

### パフォーマンス測定ユーティリティ — 設計例(未実装)

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

### テスト実行時のログ設定 — 設計例(未実装。実際の設定は各パッケージの `vitest.config.ts` を参照)

下記はカバレッジ・ベンチマーク設定を導入する場合の設計イメージ。`packages/web/vitest.config.ts` の実装は `environment: 'jsdom'` と `setupFiles: ['./vitest.setup.ts']` のみで、以下の `coverage` / `benchmark` 設定や `tests/setup.ts` は未導入。またテストランナーは vitest なので `jest.spyOn` ではなく `vi.spyOn` を使うこと。

```typescript
// vitest.config.ts(設計例)
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

// tests/setup.ts(設計例)
import { logger } from '../lib/logger';

// テスト時はログを制御
global.beforeEach(() => {
  if (process.env.TEST_VERBOSE !== 'true') {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  }
});
```

## UI 規約 — 最重要

**【重要】白黒・ミニマルデザイン必須**

- カラーテーマやアクセント色は使用しない
- 白・黒・グレーのみでインターフェース構築
- 最小限のUIコンポーネントでシンプルな構成
- 機能性重視、装飾的要素は排除

姉妹プロジェクト(`tool-starter-template` / `flow-finder`)と同じ設計言語を採用している。
**UIを毎回ゼロから組まない。以下の順で部品を使う。**

1. **`src/components/controls/` の複合部品を最優先で使う**
   - `LabeledSlider` — 設定パネルの数値スライダー行(ラベル+値+スライダー)。
     ラベルだけで意味が通らないときは `ariaLabel` で読み上げ用の名前を別に与える
   - `SegmentedControl` — 排他的なモード切替(選択モード、Pick/Annotate、Canvas/Saved)。
     `role="radiogroup"` + `role="radio"` を出すので、E2E からは `getByRole('radio')` で取る
   - `ToggleChip` — ON/OFF ピル
   - `ColorRow` — 色選択行(ラベル+スウォッチ+hex入力)
2. **汎用UIは `src/components/ui/` を使う**(Button / Card / Input / Select / Slider /
   Toggle / Modal / Sheet / Toast / Tooltip)。足りないものはここに足す。個別画面で自作しない
3. レイアウトは必ず `AppShell` の枠内で組む。**デスクトップとモバイルで別ツリーを書かない** —
   ヘッダー+左パネル+キャンバス+右パネルを渡せば、モバイルでは左右パネルが
   ボトムシート(`ui/Sheet`)に自動で切り替わる
4. 設定パネル内のグループ分けは `CollapsibleSection` を使う
5. **パネルの中身を `Card` で囲まない。** 外枠は `AppShell` のサイドバー(`border-r` / `border-l`)が
   担当する。パネル内のタイトル行は左右で揃える —
   `shrink-0 border-b border-border px-4 py-3` + `text-sm font-semibold` の見出し。
   その下にスクロール領域(`min-h-0 flex-1 overflow-y-auto p-4`)を置く
   (`ColorPalette` / `AnnotationControls` がこの形)

### キャンバス

`ImageCanvas` は flow-finder と同じ形にしてある。**この形を崩さないこと。**

- **Card もタイトルもフッター説明も持たない。** `AppShell` の中央カラムいっぱいに広がる
  フルブリードの `<canvas>` で、下地は `bg-muted`
- **キャンバス上に置く UI は右下のズームピルだけ** —
  `absolute bottom-3 right-3 ... rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur`。
  中身は `[−] [倍率] [+] [Fit]` の4つ。アイコンは `Button variant="ghost" size="icon-sm"`
- **倍率表示そのものが「実寸(100%)に戻す」ボタン**。専用の 1:1 ボタンは置かない
  (ピルに5つ目を足すと flow-finder の形から外れる)
- **それ以外の操作(Undo / Redo / Clear)はヘッダーに置く。** キャンバス内部の状態が要る場合は
  コールバックで外に出す(`onClearSelection` / `onSelectionStateChange`)
- 操作の説明文はキャンバスに書かない。左パネルの `ModeHint` が担当する

### 色とトークン

色は **`src/app/globals.css` の CSS 変数 → Tailwind セマンティッククラス**経由でのみ指定する。

- `bg-background` `text-foreground` `text-muted-foreground` `border-border` `border-input`
  `bg-primary` / `text-primary-foreground` `bg-muted` `bg-accent` `bg-card` `bg-popover`
  `ring-ring` `bg-destructive` / `text-destructive`
- **生の色クラス(`bg-gray-100` `text-white` `border-red-200` 等)は禁止**。
  `tailwind.config.ts` に `gray` パレットは定義していないので書いても効かない
- 変数値は **oklch のチャンネル値のみ**(`--background: 1 0 0;`)。
  `oklch(var(--x) / <alpha-value>)` で参照しており、`bg-foreground/40` のような
  不透明度修飾を効かせるために alpha スロットを空けてある。**完全な色関数を入れないこと**
- `--destructive` は**無彩色**にしてある(白黒ルール優先)。破壊的操作はホバーで反転させて示す
- ダークテーマの変数は定義済みだが**UIはライト固定**。`<html>` に `class="dark"` を
  付ければ有効になる。トークンを足すときは `:root` と `.dark` の両方に書く

その他:

- インラインstyle(`style={{}}`)は原則禁止。例外は**クラスで表現できない動的な値**だけ
  (スライダーの `--slider-fill`、色スウォッチの `backgroundColor`、座標追従UIの位置)
- フォントは JetBrains Mono(`next/font/google` で自己ホスト、`--font-jetbrains-mono`)
- アイコンは `@phosphor-icons/react`。インライン SVG を新しく書き足さない

### ハマりどころ

- **PNG 書き出しを DOM のスクリーンショットで作らない。** 以前は html2canvas で
  パレットカードを撮っていたが、テーマを oklch に移した途端
  `Attempting to parse an unsupported color function "oklch"` で落ち、**例外が
  console にしか出ないためダウンロードが無言で失敗していた**。
  PNG は `lib/export-formats.ts` の `exportAsPNG` / `exportPalettesAsPNG` が
  Canvas API で直接描く。書き出し結果を UI のスタイルから切り離しておくこと
- **エクスポートの失敗は必ずユーザーに届ける。** `usePaletteExportActions` は
  `onError` を受け取り、`page.tsx` がトーストに流している。`console.error` だけで終わらせない
- **canvas に文字を描くときは `lib/canvas-font.ts` の `getCanvasFontStack()` を使う。**
  `next/font` は JetBrains Mono を `__JetBrains_Mono_<hash>` という生成名で自己ホストし、
  CSS 変数 `--font-jetbrains-mono` からしか辿れない。canvas は CSS 変数を読めないので、
  ベタ書きのフォント名にすると**黙って OS フォントにフォールバックし、UI と字形がずれる**。
  書き出しに乗る文字は `ensureCanvasFontLoaded()` を await してから描くこと
  (未ロードのフォントは無言で差し替えられ、その結果がファイルとして残る)
- **`next dev` 実行中に `next build` / `next lint` を走らせない。** 同じ `.next` を
  共有しているため dev サーバーがチャンクと CSS を 404 で返すようになる。
  画面が無スタイル(font-family が `Times`)になったらこれを疑い、
  `.next` を消して dev を再起動する
- UIテキストはすべて英語

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

### 2. タスク完了ログのフォーマット — 設計例(未実装。運用上はチャット内で完了報告すれば足りる)

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
