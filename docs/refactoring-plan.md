# リファクタリング計画書

作成日: 2026-07-02
対象: painting-palette-tool(pnpm + Turborepo モノレポ)

この文書は、他の AI モデルまたは開発者が単独で実行できるように書かれた作業指示書である。
上から順に Phase 単位で実行すること。**各タスク完了ごとに必ず検証コマンドを実行し、通過してから次に進む。**

---

## 0. 前提知識(実行者は最初に読むこと)

### プロジェクト構成

```
packages/
├── web/            # Next.js 14 (App Router) の本体アプリ。Tauri 対応・PWA 対応
├── color-engine/   # 色抽出エンジン(tsup でビルド、web が workspace 依存)
└── cube-renderer/  # アイソメトリック立方体レンダラ(同上)
experiments/        # Phase 0 の技術検証パッケージ群(12個)。本番コードからは未参照
docs/               # 設計ドキュメント
tests/              # e2e / integration / fixtures ディレクトリ(現状すべて空)
```

### 検証コマンド(全タスク共通)

```bash
pnpm typecheck && pnpm lint && pnpm test
```

- `packages/web` に UI を変更した場合は `pnpm --filter @palette-tool/web build` も実行して Next.js ビルドが通ることを確認する。
- CLAUDE.md の指示に従い、タスク完了時は完了ログを記録すること。

### 計測済みベースライン(2026-07-02 時点)

| 項目 | 状態 |
|---|---|
| `pnpm typecheck` | 全 15 タスク成功 |
| `pnpm lint` | 成功。ただし `ImageCanvas.tsx` に react-hooks/exhaustive-deps 警告 2 件(445行目, 1099行目) |
| テスト | `cube-renderer` の 9 件のみ存在・全通過。**web と color-engine にはテストが 1 件もない** |
| git 状態 | master ブランチ、クリーン |

### 絶対に守る制約

1. **挙動を変えないこと。** このリファクタリングは動作変更を含まない。UI の見た目・操作・出力(エクスポート形式含む)は変更前後で同一であること。
2. **UI は白黒・ミニマルデザイン必須**(CLAUDE.md 規定)。色付きのアクセントを導入しない。
3. Phase 内のタスクは 1 タスク = 1 コミットを目安に小さく刻む。コミットメッセージは既存の慣習(`refactor:` プレフィックス等の Conventional Commits)に従う。
4. `localStorage` のキー名(`saved-palettes`, `painting-palette-ui-settings`)と保存 JSON の形式は変更しない。既存ユーザーのデータ互換性を壊さないため。

---

## 1. 現状の問題点(調査結果)

### P1: 型定義の重複(最重要・全 Phase の土台)

`RGBColor` / `ExtractedColor` インターフェースが **7 ファイル以上**でローカル定義されている:

- `packages/color-engine/src/types.ts`(本来の定義元。export 済み)
- `packages/web/src/app/page.tsx` (29–42行)
- `packages/web/src/components/features/SavedPalettesPanel.tsx` (27–33行)
- `packages/web/src/components/features/ColorPalette.tsx` (22–28行)
- `packages/web/src/lib/export-formats.ts` (19–25行)
- `packages/web/src/lib/brightness-analysis.ts` (5–11行)
- `packages/web/src/lib/color-space-conversions.ts` (5行)
- `packages/cube-renderer/src/types.ts`(RGBColor)

web 側の `ExtractedColor` は engine 版に `isAdded?: boolean` と `id?: string` を追加した拡張版になっており、構造的互換で偶然動いている状態。

### P2: 色変換ロジックの二重実装

- `packages/web/src/lib/color-space-conversions.ts`(376行): rgbToHsl / rgbToLab / rgbToLch / rgbToOklch / calculateHScL / calculateColorDistance / areColorsSimilar など
- `packages/color-engine/src/color-space.ts`(111行): `ColorSpaceConverter` クラスに rgbToLab / rgbToHsv / calculateDeltaE / calculateRgbDistance など

`rgbToLab` と色距離計算が両方に存在する。web 版の方が機能が多い(HSL/LCH/OkLCH/HScL)。

### P3: 巨大コンポーネント(神コンポーネント)

| ファイル | 行数 | useState数 | 問題 |
|---|---|---|---|
| `SavedPalettesPanel.tsx` | 1807 | 23 | localStorage 直接操作が 6 箇所以上、一覧・編集・エクスポートが混在 |
| `ImageCanvas.tsx` | 1389 | 25 | ズーム/パン/選択/アノテーション/マウス/タッチ/ホイール/キーボードの全ハンドラが 1 ファイル |
| `page.tsx` | 1060 | 25 | アノテーション undo/redo 履歴、UI 設定の永続化、抽出処理、モバイルタブが混在 |
| `ColorPalette.tsx` | 939 | 10 | パレット表示に加え localStorage への保存ロジックを重複実装 |

### P4: `saved-palettes` ストレージ操作の重複

`localStorage.getItem('saved-palettes')` → JSON.parse → 変更 → `setItem` のパターンが `SavedPalettesPanel.tsx`(583, 612, 649, 751, 826, 862行付近)と `ColorPalette.tsx`(299–321行付近)に散在。スキーマ検証なし。

### P5: テスト不在

- web(11,000 行超の中核)と color-engine にテストが 1 件もない。
- ルート `tests/`(e2e / integration / fixtures)はディレクトリだけで空。CLAUDE.md に書かれたテスト構造は未実装。
- engine 系パッケージの `test` スクリプトが `vitest`(watch モード)。CI で使う場合は `vitest run` であるべき。color-engine はテストファイル 0 件のため `vitest run` が失敗する状態。

### P6: ワークスペース衛生

- ルートに `package-lock.json` と `pnpm-lock.yaml` が併存(packageManager は pnpm。npm の lock は誤混入)。`experiments/rendering/package-lock.json` も同様。
- `experiments/` 配下 12 パッケージが turbo のデフォルトパイプラインに含まれ、typecheck/lint/build の対象になっている(本番コード未参照なのにコスト増)。
- `color-engine` / `cube-renderer` の lint スクリプトが `echo 'lint: ok'` のプレースホルダ。
- `page.tsx` に BrightnessAnalysis 関連のコメントアウトされた import / state が残存(8, 18, 59行)。
- `packages/web/src/app/test/page.tsx`(94行)という検証用ページが本番ビルドに含まれる。
- `tsconfig.tsbuildinfo` がリポジトリルートに存在(要 .gitignore 確認)。
- lint 警告 2 件(ImageCanvas.tsx の exhaustive-deps)。

---

## 2. 実行計画

実行順序は **安全網の構築 → 土台(型)→ ロジック集約 → コンポーネント分割 → 掃除** の順。
Phase 間には依存関係があるため順序を守ること。Phase 内のタスクは番号順に実行する。

---

### Phase 0: 安全網の構築(テスト追加)— 挙動変更なし

**目的:** 以降のリファクタリングで挙動が壊れていないことを検知できる状態を作る。既存コードは変更せず、テストだけ追加する(characterization test)。

#### Task 0-1: vitest の実行モード修正

- `packages/color-engine/package.json` と `packages/cube-renderer/package.json` の `"test": "vitest"` を `"test": "vitest run"` に変更。`"test:watch": "vitest"` を追加。
- color-engine はテスト 0 件で `vitest run` が失敗するため、Task 0-2 と同一コミットにするか、暫定で `--passWithNoTests` を付与。

#### Task 0-2: color-engine の単体テスト追加

新規: `packages/color-engine/src/color-space.test.ts`, `extraction.test.ts`, `sampling.test.ts`

- `ColorSpaceConverter`: 既知の色(黒・白・純赤・グレー)で rgbToLab / rgbToHsv の往復値と deltaE を検証。
- `extraction.ts` / `sampling.ts`: 小さな合成 ImageData(単色、2色、グラデーション)を入力し、抽出色数・代表色が期待通りかを検証。ImageData は Node 環境で使えないため、`{ data: Uint8ClampedArray, width, height }` 形式のプレーンオブジェクトを使うか、既存の cube-renderer のテスト手法に合わせる。

#### Task 0-3: web の lib 層テスト追加

web には vitest が未導入。`packages/web` に vitest + jsdom を devDependencies として追加し、`"test": "vitest run"` スクリプトを追加(next lint と衝突しないよう `vitest.config.ts` で `src/**/*.test.ts` のみ対象にする)。

新規テスト(すべて純粋関数なので書きやすい):

- `src/lib/color-space-conversions.test.ts` — rgbToHsl / rgbToLch / rgbToOklch / calculateHScL / areColorsSimilar を既知色で検証。**Phase 2 で移設する際の回帰検知が主目的なので、境界値(黒・白・彩度0)を必ず含める。**
- `src/lib/export-formats.test.ts` — 各エクスポート形式(864行のロジック)の出力文字列/構造をスナップショットで固定。
- `src/lib/brightness-analysis.test.ts` — 既知パレットの分析結果を固定。
- `src/lib/selection-tools.test.ts` — 選択領域計算の検証。

**完了条件:** `pnpm test` が web / color-engine / cube-renderer で全通過。カバレッジは lib 層で 60% 以上を目安(必須ではない)。

---

### Phase 1: 型の一元化 — 挙動変更なし

**目的:** `RGBColor` / `ExtractedColor` の定義元を 1 箇所にする。

#### Task 1-1: color-engine の型を拡張

`packages/color-engine/src/types.ts` の `ExtractedColor` に web 側で使っている拡張フィールドを取り込む:

```ts
export interface ExtractedColor {
  color: RGBColor;
  frequency: number;
  importance: number;
  representativeness: number;
  /** ユーザーが手動追加した色 */
  isAdded?: boolean;
  /** 色の一意識別子 */
  id?: string;
}
```

変更後 `pnpm --filter @palette-tool/color-engine build` で dist を再生成。

#### Task 1-2: web 側のローカル型定義を削除

以下のファイルのローカル `interface RGBColor` / `interface ExtractedColor` を削除し、`import type { RGBColor, ExtractedColor } from '@palette-tool/color-engine'` に置換する:

- `src/app/page.tsx`
- `src/components/features/SavedPalettesPanel.tsx`
- `src/components/features/ColorPalette.tsx`
- `src/lib/export-formats.ts`
- `src/lib/brightness-analysis.ts`
- `src/lib/color-space-conversions.ts`(このファイルは Phase 2 で消えるが、順序上ここでも置換しておく)

`HSLColor` / `LABColor` / `LCHColor` / `OkLCHColor` は現状 web 固有なので Phase 2 で扱う。

#### Task 1-3: cube-renderer の RGBColor

`cube-renderer` は独立パッケージとして `RGBColor` を持っていてよい(依存方向を増やさない)。ただし構造が color-engine 版と同一 `{r,g,b}` であることをテストコメントで明記するのみとし、変更しない。

**完了条件:** 検証コマンド全通過。`grep -rn "interface RGBColor" packages/web/src` がヒット 0 件。

---

### Phase 2: 色変換ロジックの color-engine への集約 — 挙動変更なし

**目的:** `web/src/lib/color-space-conversions.ts`(376行)の実装を color-engine に移し、二重実装を解消する。

#### Task 2-1: color-engine に関数群を移設

- `packages/color-engine/src/color-conversions.ts` を新規作成し、web 版の関数(rgbToHsl, rgbToGrayscale, rgbToLab, labToLch, rgbToLch, rgbToOklch, calculateSc, calculateHScL, getAllColorSpaces, formatColorValue, calculateColorDistance, areColorsSimilar)と型(HSLColor, LCHColor, OkLCHColor)をそのまま移す。**実装は 1 文字も変えない**(Phase 0-3 のテストで同一性を担保)。
- 既存の `ColorSpaceConverter.rgbToLab` と web 版 `rgbToLab` は実装が異なる可能性があるため、**統合せず両方残す**。統合は将来課題としてこの文書の末尾「やらないこと」に記載の通り本計画のスコープ外。
- `packages/color-engine/src/index.ts` から新モジュールを export。
- Phase 0-3 で書いた `color-space-conversions.test.ts` を color-engine 側へ移動。

#### Task 2-2: web 側を再エクスポートに置換

`packages/web/src/lib/color-space-conversions.ts` の中身を削除し、後方互換のための再エクスポートだけにする:

```ts
export * from '@palette-tool/color-engine';  // 変換関数・型
```

import 元の書き換え(`annotation-render.ts`, `page.tsx`, `ColorPalette.tsx`, `SavedPalettesPanel.tsx`, `Tooltip.tsx`, `export-formats.ts`)を engine 直 import に順次変更し、全て置換し終えたらこのファイルを削除する。

**完了条件:** 検証コマンド全通過。`packages/web/src/lib/color-space-conversions.ts` が存在しない。web ビルド成功。

---

### Phase 3: ストレージ層の抽出 — 挙動変更なし

**目的:** localStorage 操作を 1 モジュールに集約し、P4 の重複を解消する。

#### Task 3-1: `packages/web/src/lib/palette-storage.ts` を新規作成

`SavedPalettesPanel.tsx` と `ColorPalette.tsx` に散在する `saved-palettes` 操作を関数として抽出:

```ts
export interface SavedPalette { /* 既存の保存 JSON 構造をそのまま型定義化 */ }

export function loadSavedPalettes(): SavedPalette[];
export function savePalette(palette: SavedPalette): SavedPalette[];
export function updatePalette(id: string, patch: Partial<SavedPalette>): SavedPalette[];
export function deletePalette(id: string): SavedPalette[];
```

- キー名 `saved-palettes` と JSON 構造は**絶対に変更しない**。まず既存コードから保存されている実際の構造を読み取り、`SavedPalette` 型として書き起こすこと。
- JSON.parse 失敗時は空配列を返す(既存挙動に合わせる。既存が throw する実装なら throw のまま)。

#### Task 3-2: `useSavedPalettes` フックを作成

`packages/web/src/hooks/useSavedPalettes.ts`(hooks ディレクトリ新設)。state + Task 3-1 の関数を包み、`SavedPalettesPanel` と `ColorPalette` の両方から使う。

#### Task 3-3: UI 設定永続化の抽出

`page.tsx` の 142–180 行付近(`painting-palette-ui-settings` の load/save)を `packages/web/src/hooks/useUISettings.ts` に抽出。「初回レンダリングでは保存しない」ガード(`isInitialSave` ref)の挙動を維持すること。

**完了条件:** 検証コマンド全通過。`grep -rn "localStorage" packages/web/src --include="*.tsx"` のヒットが 0 件(すべて lib/hooks 層に移動)。手動確認: パレット保存 → リロード → 復元、UI 設定変更 → リロード → 復元。

---

### Phase 4: 巨大コンポーネントの分割 — 挙動変更なし・最も慎重に

**目的:** P3 の 4 ファイルを、責務ごとのフック+サブコンポーネントに分割する。
**方針:** 「ロジックをフックへ、描画をサブコンポーネントへ」。1 タスク = 1 抽出。一度に複数の抽出をしない。抽出のたびに検証コマンド+ `pnpm --filter @palette-tool/web build` + ブラウザでの手動確認(`pnpm --filter @palette-tool/web dev`)を行う。

#### Task 4-1: page.tsx(1060行 → 目標 300 行台)

抽出順:

1. `useAnnotationHistory` フック — annotations / annotationHistory / annotationFuture の 3 state と handleAnnotationsChange / Undo / Redo / Clear(100–126行)を `hooks/useAnnotationHistory.ts` へ。汎用 undo/redo として書ける。
2. `useUISettings` — Phase 3-3 で完了済みのはず。未了なら先に実施。
3. `usePaletteExtraction` フック — PaletteExtractor 呼び出し・isExtracting・processingProgress・canCancel・lastAddedColorIds 周りを `hooks/usePaletteExtraction.ts` へ。
4. コメントアウトされた BrightnessAnalysis 関連(8, 18, 59行ほか)は削除する(git 履歴に残るため復元可能)。

#### Task 4-2: ImageCanvas.tsx(1389行 → 目標 400 行台)

イベントハンドラ群をロジック単位で分離する。抽出順:

1. `hooks/useCanvasViewport.ts` — ズーム/パン state と handleZoom(453行)・handleWheel(1204行)・リサイズ(176行)。
2. `hooks/useCanvasPointer.ts` — handleMouseDown/Move/Up(657, 740, 833行)、handleTouchStart/Move/End(993, 1039, 1106行)、handleDoubleClick(944行)。マウスとタッチで同じ座標変換を通す共通関数をここに置く。
3. 選択範囲の描画ロジック(Canvas 2D 描画部分)を `lib/canvas-draw.ts` の純粋関数へ。
4. この過程で lint 警告 2 件(445行の不要依存 `isDrawing`、1099行の欠落依存 `selectionMode`)を解消する。**依存配列の修正は挙動が変わり得るため、修正前後で選択操作の手動確認を必ず行うこと。**

#### Task 4-3: SavedPalettesPanel.tsx(1807行 → 目標 500 行台)

1. Phase 3 のフック適用で localStorage 操作を除去(未了なら先に実施)。
2. サブコンポーネント分割: `SavedPaletteCard`(1 パレットの表示・操作)、`PaletteEditModal`(編集 UI)、`PaletteExportMenu`(エクスポート操作)を `components/features/saved-palettes/` ディレクトリ配下に切り出す。
3. エクスポート処理は既存の `lib/export-formats.ts` の関数を呼ぶだけの薄い層にする。

#### Task 4-4: ColorPalette.tsx(939行 → 目標 400 行台)

1. Phase 3 のフック適用で保存ロジックを除去。
2. 色 1 つ分の表示(スウォッチ+値表示)を `ColorSwatch.tsx` として抽出。
3. 並び替え・表示モード切替のロジックを `hooks/usePaletteView.ts` に抽出。

**完了条件(Phase 4 全体):** 検証コマンド全通過、web ビルド成功、lint 警告 0 件。手動確認チェックリスト:

- [ ] 画像アップロード → 色抽出 → パレット表示
- [ ] キャンバスのズーム(ホイール/ピンチ)・パン・ダブルクリックリセット
- [ ] 点選択・範囲選択での色抽出
- [ ] アノテーション追加・undo・redo・クリア・エクスポート
- [ ] パレット保存・読込・削除・エクスポート(全形式)
- [ ] モバイル幅(375px)でのタブ切替
- [ ] グレースケール切替

---

### Phase 5: ワークスペース衛生 — 挙動変更なし

順不同で実行可。各項目 1 コミット。

- **Task 5-1:** ルートの `package-lock.json` と `experiments/rendering/package-lock.json` を削除(pnpm 管理のため)。`.gitignore` に `package-lock.json` と `tsconfig.tsbuildinfo` を追加。`tsconfig.tsbuildinfo` が git 管理下なら `git rm --cached` する。
- **Task 5-2:** `experiments/` をデフォルトパイプラインから除外する。`pnpm-workspace.yaml` から外すのが最も単純だが、experiments 内から `experiments/shared` への workspace 参照があるため、外す場合は experiments 全体を独立ワークスペースにする。より安全な代替案: ルート package.json のスクリプトを `turbo run typecheck --filter='./packages/*'` 形式に変更し、experiments を CI 対象から外すだけにする。**代替案の方を推奨。**
- **Task 5-3:** `color-engine` / `cube-renderer` の `"lint": "echo 'lint: ok'"` を実際の ESLint 実行に置換。ルートに `@typescript-eslint` 一式が既にあるため、各パッケージに `.eslintrc.json`(ルート設定を extends)を置き `"lint": "eslint src --ext .ts"` とする。既存コードで新たに出る指摘は `--max-warnings` で緩めず、自明なもの(未使用 import 等)のみ修正し、それ以外はルール個別無効化ではなく修正する。
- **Task 5-4:** `packages/web/src/app/test/page.tsx` の要否をユーザーに確認する。**確認が取れるまで削除しない。** 確認できない場合はこのタスクをスキップして構わない。
- **Task 5-5:** CLAUDE.md の「テストファイル構造」節を実態(Phase 0 で作った構成)に合わせて更新。存在しない `lib/logger.ts` 等のサンプルコードは「設計例」であることが分かる見出しに変更するか、実装済みパスに書き換える。

**完了条件:** 検証コマンド全通過。`pnpm build` 成功。

---

## 3. 実行順序まとめと工数目安

| Phase | 内容 | 依存 | 目安 |
|---|---|---|---|
| 0 | テストによる安全網 | なし | 半日〜1日 |
| 1 | 型の一元化 | 0 | 1〜2時間 |
| 2 | 色変換の集約 | 0, 1 | 2〜3時間 |
| 3 | ストレージ層抽出 | 0, 1 | 2〜3時間 |
| 4 | コンポーネント分割 | 0〜3 | 2〜3日(最大) |
| 5 | ワークスペース衛生 | なし(いつでも可) | 2〜3時間 |

Phase 5 は独立しているため、他 Phase の合間に実施してよい。

## 4. やらないこと(スコープ外)

- `ColorSpaceConverter.rgbToLab` と移設した `rgbToLab` の実装統合(数値差異のリスクがあるため。統合する場合は別タスクとして両者の出力差を全 RGB 空間サンプリングで比較してから)
- 状態管理ライブラリ(Zustand 等)の導入 — 現状はフック分割で十分
- Next.js / React のバージョンアップ
- experiments/ 配下のコード品質改善(参照されていないため)
- 機能追加・UI 変更

## 5. ロールバック方針

- 各タスクは独立コミットのため、問題があれば該当コミットのみ `git revert` する。
- Phase 4 で手動確認チェックリストに 1 つでも失敗があれば、原因特定より先にそのタスクの revert を優先し、原因を特定してからやり直す。
