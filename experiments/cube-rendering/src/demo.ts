/**
 * Canvas 2D 六角形立方体のデモ実装
 */

import {
  Canvas2DCubeRenderer,
  CubeLayoutManager,
  ColorBrightnessAdjuster,
  type CubeColor,
  type CubePosition,
} from './hexagon-cube.js';

/**
 * デモ用のサンプル色パレット生成
 */
export function generateSamplePalette(): CubeColor[] {
  return [
    { r: 255, g: 87, b: 87, brightness: 0.8 }, // コーラルレッド
    { r: 255, g: 193, b: 7, brightness: 0.9 }, // アンバー
    { r: 72, g: 187, b: 120, brightness: 0.7 }, // エメラルドグリーン
    { r: 52, g: 152, b: 219, brightness: 0.6 }, // スカイブルー
    { r: 155, g: 89, b: 182, brightness: 0.5 }, // アメジスト
    { r: 241, g: 196, b: 15, brightness: 0.85 }, // ゴールド
    { r: 231, g: 76, b: 60, brightness: 0.75 }, // アリザリンレッド
    { r: 46, g: 204, b: 113, brightness: 0.8 }, // スプリンググリーン
  ];
}

/**
 * Canvas デモの初期化と実行
 */
export class Canvas2DCubeDemo {
  private renderer: Canvas2DCubeRenderer;
  private canvas: HTMLCanvasElement;
  private colors: CubeColor[];
  private positions: CubePosition[];
  private animationId: number | null = null;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }

    this.canvas = canvas;
    this.renderer = new Canvas2DCubeRenderer(canvas);
    this.colors = generateSamplePalette();
    this.positions = [];

    this.setupCanvas();
    this.setupRenderer();
  }

  /**
   * Canvas の初期設定
   */
  private setupCanvas(): void {
    // Retina対応
    const devicePixelRatio = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;

    const ctx = this.canvas.getContext('2d')!;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // スタイル設定
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  /**
   * レンダラーの設定
   */
  private setupRenderer(): void {
    this.renderer.onHoverChange = (cubeIndex: number | null) => {
      if (cubeIndex !== null) {
        this.showColorInfo(this.colors[cubeIndex]);
      } else {
        this.hideColorInfo();
      }
      this.render();
    };
  }

  /**
   * グリッドレイアウトで描画開始
   */
  startGridDemo(): void {
    this.positions = CubeLayoutManager.calculateGridPositions(
      this.colors,
      this.canvas.width,
      this.canvas.height,
      40
    );
    this.render();
  }

  /**
   * 円形レイアウトで描画開始
   */
  startCircularDemo(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.6;

    this.positions = CubeLayoutManager.calculateCircularPositions(
      this.colors,
      centerX,
      centerY,
      radius,
      35
    );
    this.render();
  }

  /**
   * アニメーション付きデモ
   */
  startAnimatedDemo(): void {
    let frame = 0;
    const animate = () => {
      frame++;
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const baseRadius = Math.min(centerX, centerY) * 0.4;

      // 時間に基づいて半径を変化させる
      const radius = baseRadius + Math.sin(frame * 0.02) * 50;

      this.positions = CubeLayoutManager.calculateCircularPositions(
        this.colors,
        centerX,
        centerY,
        radius,
        30 + Math.sin(frame * 0.03) * 10
      );

      this.render();
      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * アニメーション停止
   */
  stopAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * 描画実行
   */
  private render(): void {
    this.renderer.renderCubes(this.colors, this.positions);
  }

  /**
   * 色情報表示
   */
  private showColorInfo(color: CubeColor): void {
    const info = document.getElementById('color-info');
    if (info) {
      const brightness = ColorBrightnessAdjuster.getPerceptualBrightness(
        color.r / 255,
        color.g / 255,
        color.b / 255
      );

      info.innerHTML = `
        <div>RGB: ${color.r}, ${color.g}, ${color.b}</div>
        <div>輝度: ${(brightness * 100).toFixed(1)}%</div>
        <div style="width: 30px; height: 20px; background: rgb(${color.r}, ${color.g}, ${color.b}); border: 1px solid #ccc;"></div>
      `;
      info.style.display = 'block';
    }
  }

  /**
   * 色情報非表示
   */
  private hideColorInfo(): void {
    const info = document.getElementById('color-info');
    if (info) {
      info.style.display = 'none';
    }
  }

  /**
   * 新しい色パレットを設定
   */
  updatePalette(newColors: CubeColor[]): void {
    this.colors = newColors;
    this.positions = CubeLayoutManager.calculateGridPositions(
      this.colors,
      this.canvas.width,
      this.canvas.height
    );
    this.render();
  }
}

/**
 * パフォーマンス測定付きデモ
 */
export class PerformanceTestDemo {
  private canvas: HTMLCanvasElement;
  private renderer: Canvas2DCubeRenderer;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }

    this.canvas = canvas;
    this.renderer = new Canvas2DCubeRenderer(canvas);
  }

  /**
   * 大量描画のパフォーマンステスト
   */
  async testLargeScale(cubeCount: number = 100): Promise<{
    renderTime: number;
    fps: number;
    memoryUsage: number;
  }> {
    // 大量の立方体を生成
    const colors: CubeColor[] = [];
    for (let i = 0; i < cubeCount; i++) {
      colors.push({
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256),
        brightness: Math.random(),
      });
    }

    const positions = CubeLayoutManager.calculateGridPositions(
      colors,
      this.canvas.width,
      this.canvas.height,
      20
    );

    // パフォーマンス測定
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const startTime = performance.now();

    let frameCount = 0;
    const testDuration = 1000; // 1秒間測定

    const fps = await new Promise<number>((resolve) => {
      const measureFPS = () => {
        const currentTime = performance.now();
        if (currentTime - startTime < testDuration) {
          this.renderer.renderCubes(colors, positions);
          frameCount++;
          requestAnimationFrame(measureFPS);
        } else {
          const actualDuration = currentTime - startTime;
          resolve((frameCount * 1000) / actualDuration);
        }
      };
      measureFPS();
    });

    const renderTime = performance.now() - startTime;
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryUsage = endMemory - startMemory;

    return {
      renderTime,
      fps,
      memoryUsage,
    };
  }

  /**
   * 色数によるパフォーマンス比較
   */
  async benchmarkColorCounts(): Promise<
    Array<{
      colorCount: number;
      renderTime: number;
      fps: number;
    }>
  > {
    const testCounts = [10, 25, 50, 100, 200];
    const results = [];

    for (const count of testCounts) {
      const result = await this.testLargeScale(count);
      results.push({
        colorCount: count,
        renderTime: result.renderTime,
        fps: result.fps,
      });

      // 各テスト間で少し待機
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }
}
