# 絵画支援パレット抽出ツール - 最終アーキテクチャ設計

**バージョン**: 1.0.0  
**作成日**: 2025-07-20  
**Phase**: 0 → 1 移行時アーキテクチャ確定版

## 1. システム概要

### 1.1 アーキテクチャビジョン

参考画像から絵画制作に最適化された色パレットを抽出し、立方体アイソメトリック図で明暗構造を可視化する高性能Webアプリケーション。

### 1.2 核心技術スタック

- **フロントエンド**: TypeScript + Canvas 2D API
- **色処理**: LAB色空間 + CIE標準準拠変換
- **描画エンジン**: 六角形ベース擬似3D立方体
- **最適化**: TypedArray + バッチ処理
- **品質保証**: Vitest + 包括的テスト

### 1.3 性能・品質目標

- **処理速度**: 2048×2048画像を7秒以内で色抽出
- **描画性能**: 50立方体を60fps描画
- **色精度**: LAB色空間でΔE < 5.0
- **メモリ効率**: TypedArray活用で50%削減

---

## 2. システムアーキテクチャ

### 2.1 全体構成

```
┌─────────────────────────────────────────────────────────┐
│                    Web Application                      │
├─────────────────────────────────────────────────────────┤
│  UI Layer (TypeScript + Canvas 2D)                     │
│  ├─ File Input ├─ Palette Display ├─ Controls          │
├─────────────────────────────────────────────────────────┤
│  Core Processing Engine                                 │
│  ├─ Color Extraction ├─ Space Conversion ├─ Rendering  │
├─────────────────────────────────────────────────────────┤
│  Optimization Layer                                     │
│  ├─ TypedArray ├─ Batch Processing ├─ Cache           │
├─────────────────────────────────────────────────────────┤
│  Standards & Quality                                    │
│  ├─ CIE Standards ├─ Testing ├─ Benchmarks            │
└─────────────────────────────────────────────────────────┘
```

### 2.2 パッケージ構成

```
painting-palette-tool/
├── packages/
│   ├── web/                    # メインWebアプリケーション
│   │   ├── src/
│   │   │   ├── components/     # UI コンポーネント
│   │   │   ├── services/       # ビジネスロジック
│   │   │   ├── utils/          # ユーティリティ
│   │   │   └── types/          # 型定義
│   │   ├── public/             # 静的ファイル
│   │   └── tests/              # E2Eテスト
│   │
│   ├── color-engine/           # 色処理エンジン
│   │   ├── src/
│   │   │   ├── extraction/     # 色抽出アルゴリズム
│   │   │   ├── conversion/     # 色空間変換
│   │   │   ├── analysis/       # 色分析・品質評価
│   │   │   └── optimization/   # 性能最適化
│   │   └── tests/              # 単体テスト
│   │
│   ├── cube-renderer/          # 3D立方体描画
│   │   ├── src/
│   │   │   ├── geometry/       # 幾何計算
│   │   │   ├── rendering/      # Canvas描画
│   │   │   ├── animation/      # アニメーション
│   │   │   └── interaction/    # インタラクション
│   │   └── tests/              # 描画テスト
│   │
│   └── shared/                 # 共通ライブラリ
│       ├── src/
│       │   ├── types/          # 共通型定義
│       │   ├── constants/      # 定数
│       │   ├── utils/          # ユーティリティ
│       │   └── validation/     # バリデーション
│       └── tests/              # 共通テスト
│
├── experiments/                # Phase 0検証結果（参考用）
├── docs/                       # 設計ドキュメント
└── tools/                      # 開発ツール
```

### 2.3 データフロー設計

```
[Image Input]
    ↓
[Image Processing]
    ├─ ImageData extraction
    ├─ Smart sampling (15K pixels max)
    └─ Color space validation
    ↓
[Color Extraction Engine]
    ├─ K-means++ clustering
    ├─ LAB color space processing
    └─ Quality validation
    ↓
[Color Space Conversion]
    ├─ sRGB → Linear RGB → XYZ → LAB
    ├─ Perceptual color distance (ΔE)
    └─ Brightness analysis
    ↓
[3D Visualization]
    ├─ Hexagon-based pseudo-cube generation
    ├─ Canvas 2D isometric rendering
    └─ Interactive hover effects
    ↓
[Output Generation]
    ├─ Palette export (JSON/PNG)
    ├─ Color analysis report
    └─ Visualization save
```

---

## 3. コアコンポーネント設計

### 3.1 色処理エンジン (color-engine)

#### 3.1.1 ColorExtractionEngine

```typescript
interface ColorExtractionConfig {
  maxColors: number; // 抽出色数 (3-20)
  samplingStrategy: 'uniform' | 'importance' | 'edge';
  maxSamples: number; // 最大サンプル数 (15000)
  convergenceThreshold: number; // 収束判定 (0.001)
  qualityThreshold: number; // 品質閾値 (0.75)
}

class ColorExtractionEngine {
  private sampler: SmartSampler;
  private clusterer: OptimizedKMeansExtractor;
  private validator: QualityValidator;

  async extractPalette(
    imageData: ImageData,
    config: ColorExtractionConfig
  ): Promise<ExtractedPalette>;
}
```

#### 3.1.2 ColorSpaceConverter

```typescript
interface ColorSpaceConverter {
  // 基本変換
  srgbToLab(srgb: SRGBColor): LABColor;
  labToSrgb(lab: LABColor): SRGBColor;

  // バッチ変換
  convertImageDataToLab(imageData: ImageData): Float32Array;

  // 色差計算
  calculateDeltaE(
    color1: SRGBColor,
    color2: SRGBColor,
    method: 'CIE76' | 'CIE94' | 'CIEDE2000'
  ): number;
}
```

#### 3.1.3 QualityValidator

```typescript
interface QualityMetrics {
  colorDiversity: number; // 色多様性 (0-1)
  luminanceRange: number; // 輝度範囲 (0-1)
  temperatureBalance: number; // 暖色・寒色バランス
  perceptualDistance: number; // 知覚距離 (平均ΔE)
  clusterCohesion: number; // クラスター結合度
}

class QualityValidator {
  validatePalette(colors: LABColor[]): QualityMetrics;
  meetsQualityThreshold(metrics: QualityMetrics): boolean;
}
```

### 3.2 立方体描画エンジン (cube-renderer)

#### 3.2.1 CubeGeometry

```typescript
interface CubePosition {
  x: number;
  y: number;
  size: number;
  depth?: number;
}

interface CubeFaces {
  top: Path2D; // 六角形上面
  left: Path2D; // 平行四辺形左面
  right: Path2D; // 平行四辺形右面
}

class CubeGeometry {
  generateCubeFaces(position: CubePosition): CubeFaces;
  calculateIsometricProjection(position: CubePosition): Point3D[];
}
```

#### 3.2.2 CanvasCubeRenderer

```typescript
interface RenderingOptions {
  enableHover: boolean;
  showColorInfo: boolean;
  animationDuration: number;
  devicePixelRatio: number;
}

class CanvasCubeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private geometry: CubeGeometry;
  private colorAdjuster: ColorBrightnessAdjuster;

  renderCubes(
    colors: LABColor[],
    layout: CubeLayout,
    options: RenderingOptions
  ): Promise<void>;

  setupInteraction(): void;
  handleHover(event: MouseEvent): void;
  exportAsImage(format: 'png' | 'jpeg'): Blob;
}
```

#### 3.2.3 CubeLayoutManager

```typescript
type LayoutType = 'grid' | 'circular' | 'spiral' | 'brightness-sorted';

interface CubeLayout {
  type: LayoutType;
  positions: CubePosition[];
  containerWidth: number;
  containerHeight: number;
}

class CubeLayoutManager {
  generateLayout(
    colorCount: number,
    type: LayoutType,
    containerSize: { width: number; height: number }
  ): CubeLayout;
}
```

### 3.3 Webアプリケーション (web)

#### 3.3.1 PaletteExtractionService

```typescript
interface ExtractionProgress {
  stage: 'loading' | 'sampling' | 'clustering' | 'rendering';
  progress: number; // 0-100
  message: string;
}

class PaletteExtractionService {
  private colorEngine: ColorExtractionEngine;
  private cubeRenderer: CanvasCubeRenderer;

  async extractPalette(
    file: File,
    config: ColorExtractionConfig,
    onProgress: (progress: ExtractionProgress) => void
  ): Promise<PaletteResult>;
}
```

#### 3.3.2 UIコンポーネント構成

```typescript
// メインアプリケーション
interface AppState {
  currentImage: File | null;
  extractedPalette: ExtractedPalette | null;
  isProcessing: boolean;
  processingProgress: ExtractionProgress;
  configuration: ColorExtractionConfig;
}

// 主要コンポーネント
- ImageUploadComponent: ファイル選択・ドラッグ&ドロップ
- ConfigurationPanel: 抽出設定UI
- ProgressIndicator: 処理進捗表示
- PaletteVisualization: 立方体表示
- ColorInformation: 色情報パネル
- ExportControls: エクスポート機能
```

---

## 4. パフォーマンス設計

### 4.1 処理最適化戦略

#### 4.1.1 TypedArray活用

```typescript
// メモリ効率的な色データ管理
class ColorDataManager {
  private rgbData: Uint8ClampedArray; // 8bit RGB (ImageData互換)
  private labData: Float32Array; // 32bit LAB (高精度)
  private clusterData: Uint16Array; // 16bit cluster IDs

  convertToTypedArrays(imageData: ImageData): void;
  getBatchProcessingChunk(chunkSize: number): Float32Array;
}
```

#### 4.1.2 バッチ処理

```typescript
interface BatchProcessor {
  processBatch<T, R>(
    data: T[],
    batchSize: number,
    processor: (batch: T[]) => R[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<R[]>;
}

// 色空間変換のバッチ処理
class ColorConversionBatch {
  convertSRGBToLABBatch(
    rgbArray: Uint8ClampedArray,
    batchSize: number = 1000
  ): Float32Array;
}
```

#### 4.1.3 キャッシュ戦略

```typescript
interface CacheStrategy {
  // 色変換結果キャッシュ
  colorConversion: LRUCache<string, LABColor>;

  // 幾何計算キャッシュ
  cubeGeometry: Map<string, CubeFaces>;

  // レンダリングキャッシュ
  renderedCubes: Map<string, ImageData>;
}
```

### 4.2 レンダリング最適化

#### 4.2.1 Canvas 2D最適化

```typescript
interface CanvasOptimizations {
  // デバイスピクセル比対応
  setupHighDPI(canvas: HTMLCanvasElement): void;

  // 描画状態管理
  saveRenderingState(): CanvasState;
  restoreRenderingState(state: CanvasState): void;

  // バッチ描画
  renderCubesBatch(cubes: CubeData[]): void;

  // オフスクリーンレンダリング
  preRenderCubes(colors: LABColor[]): Map<string, ImageData>;
}
```

#### 4.2.2 アニメーション最適化

```typescript
class AnimationManager {
  private animationFrame: number;
  private interpolator: EasingInterpolator;

  animateLayout(
    fromLayout: CubeLayout,
    toLayout: CubeLayout,
    duration: number,
    easing: EasingFunction
  ): Promise<void>;

  optimizeForFrameRate(targetFPS: number): void;
}
```

### 4.3 メモリ管理

#### 4.3.1 リソース管理

```typescript
interface ResourceManager {
  // ImageDataの適切な解放
  releaseImageData(imageData: ImageData): void;

  // TypedArrayの再利用
  recycleTypedArray<T extends TypedArray>(array: T): void;

  // Canvasリソース管理
  cleanupCanvas(canvas: HTMLCanvasElement): void;

  // メモリ使用量監視
  getMemoryUsage(): MemoryInfo;
}
```

---

## 5. 品質保証設計

### 5.1 テスト戦略

#### 5.1.1 単体テスト (packages/\*/tests/)

```typescript
// 色抽出エンジンテスト
describe('ColorExtractionEngine', () => {
  it('標準画像で正確な色抽出を行う', () => {
    // 既知の色を持つテスト画像での精度検証
  });

  it('大容量画像でメモリ効率を維持する', () => {
    // メモリ使用量の上限チェック
  });

  it('品質閾値を満たす結果を生成する', () => {
    // QualityMetricsの検証
  });
});

// 色空間変換テスト
describe('ColorSpaceConverter', () => {
  it('CIE標準色を正確に変換する', () => {
    // D65白点、RGB原色の変換精度
  });

  it('ラウンドトリップ変換で精度を保持する', () => {
    // sRGB → LAB → sRGB の可逆性
  });
});
```

#### 5.1.2 統合テスト

```typescript
describe('End-to-End Color Processing', () => {
  it('画像ファイルから立方体描画まで完全フロー', async () => {
    const result = await processingPipeline.execute(testImage);
    expect(result.palette).toHaveLength(8);
    expect(result.qualityMetrics.colorDiversity).toBeGreaterThan(0.8);
  });
});
```

#### 5.1.3 パフォーマンステスト

```typescript
describe('Performance Benchmarks', () => {
  it('2048x2048画像を7秒以内で処理', async () => {
    const startTime = performance.now();
    await extractColors(largeTestImage);
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(7000);
  });

  it('50立方体を60fps描画', () => {
    const frameRate = measureRenderingFrameRate(50);
    expect(frameRate).toBeGreaterThan(60);
  });
});
```

### 5.2 品質メトリクス

#### 5.2.1 色抽出品質

| メトリクス           | 最小値 | 推奨値 | 測定方法      |
| -------------------- | ------ | ------ | ------------- |
| **色多様性**         | 0.75   | 0.85   | 色相円周分散  |
| **輝度範囲**         | 0.6    | 0.8    | min-max正規化 |
| **知覚距離**         | < 8.0  | < 5.0  | LAB色空間ΔE   |
| **クラスター結合度** | 0.7    | 0.8    | 内部分散比    |

#### 5.2.2 描画品質

| メトリクス   | 要求仕様             | 検証方法           |
| ------------ | -------------------- | ------------------ |
| **3D効果**   | アイソメトリック一致 | 幾何計算検証       |
| **色精度**   | WCAG準拠明度差       | 知覚輝度計算       |
| **滑らかさ** | 60fps維持            | フレームレート測定 |

### 5.3 エラーハンドリング

#### 5.3.1 ユーザーエラー対応

```typescript
interface ErrorHandler {
  // ファイル形式エラー
  handleUnsupportedFormat(file: File): UserFeedback;

  // 画像サイズエラー
  handleOversizedImage(size: number): UserFeedback;

  // 処理タイムアウト
  handleProcessingTimeout(): UserFeedback;

  // メモリ不足
  handleOutOfMemory(): UserFeedback;
}
```

#### 5.3.2 技術エラー対応

```typescript
interface TechnicalErrorHandler {
  // Canvas未対応
  handleCanvasUnsupported(): FallbackStrategy;

  // TypedArray未対応
  handleTypedArrayUnsupported(): FallbackStrategy;

  // 色抽出失敗
  handleExtractionFailure(error: ExtractionError): RecoveryStrategy;
}
```

---

## 6. 拡張性設計

### 6.1 アルゴリズム拡張

#### 6.1.1 色抽出アルゴリズム

```typescript
interface ColorExtractionAlgorithm {
  name: string;
  extractColors(imageData: ImageData, config: any): Promise<LABColor[]>;
  getDefaultConfig(): any;
  validateConfig(config: any): boolean;
}

// 将来的なアルゴリズム追加
class AlgorithmRegistry {
  register(algorithm: ColorExtractionAlgorithm): void;
  getAvailable(): string[];
  create(name: string): ColorExtractionAlgorithm;
}

// 実装例: Octree量子化
class OctreeQuantization implements ColorExtractionAlgorithm {
  name = 'octree';
  extractColors(
    imageData: ImageData,
    config: OctreeConfig
  ): Promise<LABColor[]>;
}
```

#### 6.1.2 描画手法拡張

```typescript
interface RenderingEngine {
  name: string;
  render(colors: LABColor[], container: HTMLElement): Promise<void>;
  supportsAnimation(): boolean;
  supportsInteraction(): boolean;
}

// WebGL実装（将来）
class WebGLCubeRenderer implements RenderingEngine {
  name = 'webgl';
  render(colors: LABColor[], container: HTMLElement): Promise<void>;
}
```

### 6.2 出力形式拡張

#### 6.2.1 エクスポート形式

```typescript
interface ExportFormat {
  name: string;
  extension: string;
  mimeType: string;
  export(palette: ExtractedPalette): Blob;
}

// 実装例
class JSONExporter implements ExportFormat {
  name = 'JSON';
  extension = 'json';
  mimeType = 'application/json';
  export(palette: ExtractedPalette): Blob;
}

class AdobeASEExporter implements ExportFormat {
  name = 'Adobe Swatch Exchange';
  extension = 'ase';
  mimeType = 'application/octet-stream';
  export(palette: ExtractedPalette): Blob;
}
```

### 6.3 プラグインシステム

#### 6.3.1 プラグインインターフェース

```typescript
interface Plugin {
  name: string;
  version: string;
  description: string;

  onInstall(): Promise<void>;
  onUninstall(): Promise<void>;

  // フック
  onImageLoad?(imageData: ImageData): ImageData;
  onColorsExtracted?(colors: LABColor[]): LABColor[];
  onRenderComplete?(canvas: HTMLCanvasElement): void;
}

class PluginManager {
  install(plugin: Plugin): Promise<void>;
  uninstall(name: string): Promise<void>;
  getInstalled(): Plugin[];
  executeHook(hookName: string, ...args: any[]): Promise<any[]>;
}
```

---

## 7. セキュリティ設計

### 7.1 ファイル処理セキュリティ

#### 7.1.1 ファイル検証

```typescript
interface FileValidator {
  // ファイル形式検証
  validateFileType(file: File): boolean;

  // ファイルサイズ制限
  validateFileSize(file: File, maxSize: number): boolean;

  // 画像ヘッダー検証
  validateImageHeader(file: File): Promise<boolean>;

  // XSS対策
  sanitizeFileName(filename: string): string;
}
```

#### 7.1.2 メモリ安全性

```typescript
interface MemorySafety {
  // バッファオーバーフロー防止
  validateArrayBounds(array: TypedArray, index: number): boolean;

  // メモリ使用量制限
  enforceMemoryLimit(currentUsage: number, limit: number): void;

  // リソース解放強制
  forceGarbageCollection(): void;
}
```

### 7.2 データプライバシー

#### 7.2.1 ローカル処理

- **原則**: すべての画像処理をクライアントサイドで実行
- **データ送信**: 一切の画像データをサーバーに送信しない
- **ストレージ**: sessionStorageのみ使用、永続化なし

#### 7.2.2 権限管理

```typescript
interface PermissionManager {
  // ファイルアクセス許可
  requestFileAccess(): Promise<boolean>;

  // ローカルストレージ使用許可
  requestStorageAccess(): Promise<boolean>;

  // クリップボードアクセス許可
  requestClipboardAccess(): Promise<boolean>;
}
```

---

## 8. 運用・保守設計

### 8.1 監視・ログ

#### 8.1.1 パフォーマンス監視

```typescript
interface PerformanceMonitor {
  // 処理時間測定
  measureExtractionTime(imageSize: number): number;

  // メモリ使用量監視
  trackMemoryUsage(): MemoryInfo;

  // エラー率監視
  trackErrorRate(): number;

  // ユーザー体験指標
  measureUserInteractionLatency(): number;
}
```

#### 8.1.2 エラー追跡

```typescript
interface ErrorTracker {
  // エラー分類
  categorizeError(error: Error): ErrorCategory;

  // 匿名化エラー送信
  reportError(error: Error, context: ErrorContext): void;

  // 復旧可能性判定
  assessRecoverability(error: Error): RecoveryStrategy;
}
```

### 8.2 バージョン管理

#### 8.2.1 互換性管理

```typescript
interface VersionManager {
  // 設定ファイル互換性
  migrateConfig(config: any, fromVersion: string, toVersion: string): any;

  // エクスポートデータ互換性
  upgradeExportFormat(data: any, version: string): any;

  // APIバージョン管理
  handleVersionMismatch(clientVersion: string, serverVersion: string): void;
}
```

### 8.3 ドキュメント管理

#### 8.3.1 API ドキュメント

- **自動生成**: TypeScriptからのAPI仕様書生成
- **使用例**: 各パッケージのサンプルコード
- **変更履歴**: CHANGELOG.mdでの破壊的変更記録

#### 8.3.2 ユーザーマニュアル

- **操作ガイド**: ステップバイステップ説明
- **トラブルシューティング**: よくある問題と解決策
- **パフォーマンスガイド**: 最適な使用方法

---

## 9. 実装ロードマップ

### 9.1 Phase 1: MVP実装 (4週間)

#### Week 1: コア機能基盤

- [ ] パッケージ構造セットアップ
- [ ] 色抽出エンジン基本実装
- [ ] 色空間変換ライブラリ統合
- [ ] Canvas描画基盤

#### Week 2: UI実装

- [ ] ファイルアップロード機能
- [ ] 基本的な設定UI
- [ ] 進捗表示機能
- [ ] エラーハンドリング

#### Week 3: 描画実装

- [ ] 立方体描画エンジン統合
- [ ] レイアウト管理
- [ ] 基本インタラクション
- [ ] カラー情報表示

#### Week 4: 統合・最適化

- [ ] 全機能統合テスト
- [ ] パフォーマンス最適化
- [ ] ユーザビリティテスト
- [ ] MVP完成

### 9.2 Phase 2: 機能拡張 (6週間)

#### Week 5-6: 高度な機能

- [ ] アニメーション実装
- [ ] 詳細設定UI
- [ ] エクスポート機能拡張
- [ ] アクセシビリティ向上

#### Week 7-8: ユーザー体験

- [ ] チュートリアル実装
- [ ] ヘルプシステム
- [ ] キーボードショートカット
- [ ] レスポンシブデザイン

#### Week 9-10: 品質向上

- [ ] 包括的テスト実装
- [ ] クロスブラウザ対応
- [ ] パフォーマンス監視
- [ ] セキュリティ強化

### 9.3 Phase 3: 最適化・拡張 (4週間)

#### Week 11-12: 高性能化

- [ ] 並列処理実装
- [ ] WebGL描画検討
- [ ] ServiceWorker対応
- [ ] PWA機能

#### Week 13-14: 拡張機能

- [ ] プラグインシステム
- [ ] 追加アルゴリズム
- [ ] API公開
- [ ] 最終最適化

---

## 10. 結論

### 10.1 アーキテクチャ確定事項

**技術スタック**: ✅ **確定**

- Canvas 2D + LAB色空間 + TypeScript
- 高性能K-means + CIE標準色空間変換
- 六角形ベース立方体 + バッチ処理最適化

**性能要件**: ✅ **達成可能**

- Phase 0検証で全性能目標を上回る結果
- 実用レベルの処理速度・品質・安定性確認

**拡張性**: ✅ **確保**

- モジュラー設計による柔軟な機能追加
- プラグインシステムによる第三者拡張対応

### 10.2 Phase 1 実装準備完了

**基盤技術**: すべてPhase 0で実装・検証済み  
**設計指針**: 詳細なアーキテクチャ仕様確定  
**品質基準**: 具体的なテスト・監視計画策定  
**リスク対策**: 予見可能な問題への対処法確立

### 10.3 最終推奨

本アーキテクチャ設計に基づく**Phase 1 MVP開発の即座開始**を強く推奨します。

Phase 0での徹底的な技術検証により、このアーキテクチャは**商用品質の絵画支援ツール**として十分な性能・品質・拡張性を持つことが実証されています。特に、Canvas 2D + LAB色空間の組み合わせは、絵画制作者が求める**高精度な色表現と直感的な可視化**を同時に実現する最適解です。

---

**アーキテクチャ設計書 終了**

_本設計書は Phase 0 検証結果に基づく確定版であり、Phase 1-3 開発の技術指針として機能します。_
