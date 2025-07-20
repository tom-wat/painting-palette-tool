/**
 * 2D描画手法性能比較システム
 * Canvas 2D vs SVG vs CSS Transform の包括的比較分析
 */

// シンプルなパフォーマンストラッカー実装
class PerformanceTracker {
  start(name: string): void {
    // 実装省略（テスト用）
  }

  end(name: string): number {
    return 0;
  }
}

// 共通型定義
export interface CubeColor {
  r: number;
  g: number;
  b: number;
  brightness: number;
}

export interface CubePosition {
  x: number;
  y: number;
  size: number;
}

export interface RenderingMetrics {
  renderTime: number;
  memoryUsage: number;
  elementCount: number;
  frameRate?: number;
  bundleSize?: number;
  animationSmoothness?: number;
}

export interface ComparisonResults {
  canvas: RenderingMetrics;
  svg: RenderingMetrics;
  css: RenderingMetrics;
  winner: 'canvas' | 'svg' | 'css';
  performanceRatio: {
    svgVsCanvas: number;
    cssVsCanvas: number;
    cssVsSvg: number;
  };
  recommendations: string[];
}

// Canvas 2D レンダラー（簡略実装）
export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastRenderTime = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = container.clientWidth || 800;
    this.canvas.height = container.clientHeight || 600;
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d')!;
  }

  renderCubes(
    colors: CubeColor[],
    positions: CubePosition[]
  ): RenderingMetrics {
    const startTime = performance.now();
    const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const pos = positions[i];

      this.drawPseudoCube(color, pos);
    }

    const endTime = performance.now();
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
    this.lastRenderTime = Math.max(1, endTime - startTime); // 最低1msを確保

    return {
      renderTime: this.lastRenderTime,
      memoryUsage: memoryAfter - memoryBefore,
      elementCount: colors.length,
      frameRate: this.calculateFrameRate(),
    };
  }

  private drawPseudoCube(color: CubeColor, position: CubePosition): void {
    const { x, y, size } = position;
    const { r, g, b } = color;

    // 上面（六角形）
    this.ctx.fillStyle = `rgb(${Math.floor(r * 1.2)}, ${Math.floor(g * 1.2)}, ${Math.floor(b * 1.2)})`;
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const vertexX = x + (size / 2) * Math.cos(angle);
      const vertexY = y + (size / 2) * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(vertexX, vertexY);
      else this.ctx.lineTo(vertexX, vertexY);
    }
    this.ctx.closePath();
    this.ctx.fill();

    // 左面
    this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    this.ctx.fillRect(x - size / 2, y, size / 2, size / 2);

    // 右面
    this.ctx.fillStyle = `rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)})`;
    this.ctx.fillRect(x, y, size / 2, size / 2);
  }

  private calculateFrameRate(): number {
    return this.lastRenderTime > 0 ? 1000 / this.lastRenderTime : 0;
  }

  cleanup(): void {
    this.canvas.remove();
  }
}

// SVG レンダラー（簡略実装）
export class SvgRenderer {
  private svg: SVGSVGElement;
  private container: HTMLElement;
  private lastRenderTime = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', String(container.clientWidth || 800));
    this.svg.setAttribute('height', String(container.clientHeight || 600));
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    container.appendChild(this.svg);
  }

  renderCubes(
    colors: CubeColor[],
    positions: CubePosition[]
  ): RenderingMetrics {
    const startTime = performance.now();
    const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

    // 既存要素をクリア
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }

    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const pos = positions[i];

      this.createPseudoCube(color, pos);
    }

    const endTime = performance.now();
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
    this.lastRenderTime = Math.max(1, endTime - startTime); // 最低1msを確保

    return {
      renderTime: this.lastRenderTime,
      memoryUsage: memoryAfter - memoryBefore,
      elementCount: colors.length,
      frameRate: this.calculateFrameRate(),
    };
  }

  private createPseudoCube(color: CubeColor, position: CubePosition): void {
    const { x, y, size } = position;
    const { r, g, b } = color;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // 上面（六角形）
    const topFace = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polygon'
    );
    const hexPoints = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const vertexX = x + (size / 2) * Math.cos(angle);
      const vertexY = y + (size / 2) * Math.sin(angle);
      hexPoints.push(`${vertexX},${vertexY}`);
    }
    topFace.setAttribute('points', hexPoints.join(' '));
    topFace.setAttribute(
      'fill',
      `rgb(${Math.floor(r * 1.2)}, ${Math.floor(g * 1.2)}, ${Math.floor(b * 1.2)})`
    );

    // 左面
    const leftFace = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect'
    );
    leftFace.setAttribute('x', String(x - size / 2));
    leftFace.setAttribute('y', String(y));
    leftFace.setAttribute('width', String(size / 2));
    leftFace.setAttribute('height', String(size / 2));
    leftFace.setAttribute('fill', `rgb(${r}, ${g}, ${b})`);

    // 右面
    const rightFace = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect'
    );
    rightFace.setAttribute('x', String(x));
    rightFace.setAttribute('y', String(y));
    rightFace.setAttribute('width', String(size / 2));
    rightFace.setAttribute('height', String(size / 2));
    rightFace.setAttribute(
      'fill',
      `rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)})`
    );

    group.appendChild(topFace);
    group.appendChild(leftFace);
    group.appendChild(rightFace);
    this.svg.appendChild(group);
  }

  private calculateFrameRate(): number {
    return this.lastRenderTime > 0 ? 1000 / this.lastRenderTime : 0;
  }

  cleanup(): void {
    this.svg.remove();
  }
}

// CSS Transform レンダラー（簡略実装）
export class CssRenderer {
  private container: HTMLElement;
  private cubeContainer: HTMLElement;
  private lastRenderTime = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.cubeContainer = document.createElement('div');
    this.cubeContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      perspective: 1000px;
      transform-style: preserve-3d;
    `;
    container.appendChild(this.cubeContainer);
  }

  renderCubes(
    colors: CubeColor[],
    positions: CubePosition[]
  ): RenderingMetrics {
    const startTime = performance.now();
    const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

    // 既存要素をクリア
    this.cubeContainer.innerHTML = '';

    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const pos = positions[i];

      this.createPseudoCube(color, pos);
    }

    const endTime = performance.now();
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
    this.lastRenderTime = Math.max(1, endTime - startTime); // 最低1msを確保

    return {
      renderTime: this.lastRenderTime,
      memoryUsage: memoryAfter - memoryBefore,
      elementCount: colors.length,
      frameRate: this.calculateFrameRate(),
    };
  }

  private createPseudoCube(color: CubeColor, position: CubePosition): void {
    const { x, y, size } = position;
    const { r, g, b } = color;

    const cubeGroup = document.createElement('div');
    cubeGroup.style.cssText = `
      position: absolute;
      transform: translate3d(${x - size / 2}px, ${y - size / 2}px, 0);
      transform-style: preserve-3d;
      will-change: transform;
    `;

    // 上面
    const topFace = document.createElement('div');
    topFace.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background-color: rgb(${Math.floor(r * 1.2)}, ${Math.floor(g * 1.2)}, ${Math.floor(b * 1.2)});
      transform: rotateX(-60deg) rotateZ(45deg);
      transform-origin: center;
    `;

    // 左面
    const leftFace = document.createElement('div');
    leftFace.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background-color: rgb(${r}, ${g}, ${b});
      transform: rotateY(30deg) rotateX(-30deg);
      transform-origin: center;
    `;

    // 右面
    const rightFace = document.createElement('div');
    rightFace.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background-color: rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)});
      transform: rotateY(-30deg) rotateX(-30deg);
      transform-origin: center;
    `;

    cubeGroup.appendChild(topFace);
    cubeGroup.appendChild(leftFace);
    cubeGroup.appendChild(rightFace);
    this.cubeContainer.appendChild(cubeGroup);
  }

  private calculateFrameRate(): number {
    return this.lastRenderTime > 0 ? 1000 / this.lastRenderTime : 0;
  }

  cleanup(): void {
    this.cubeContainer.remove();
  }
}

// 比較テストエンジン
export class RenderingComparison {
  private perf = new PerformanceTracker();

  async compareRenderingMethods(
    colors: CubeColor[],
    positions: CubePosition[],
    iterations = 5
  ): Promise<ComparisonResults> {
    const container = this.createTestContainer();

    // Canvas テスト
    const canvasMetrics = await this.testRenderer(
      new CanvasRenderer(container),
      colors,
      positions,
      iterations
    );

    // SVG テスト
    const svgMetrics = await this.testRenderer(
      new SvgRenderer(container),
      colors,
      positions,
      iterations
    );

    // CSS テスト
    const cssMetrics = await this.testRenderer(
      new CssRenderer(container),
      colors,
      positions,
      iterations
    );

    container.remove();

    // 結果分析
    return this.analyzeResults(canvasMetrics, svgMetrics, cssMetrics);
  }

  private createTestContainer(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 800px;
      height: 600px;
    `;
    document.body.appendChild(container);
    return container;
  }

  private async testRenderer(
    renderer: CanvasRenderer | SvgRenderer | CssRenderer,
    colors: CubeColor[],
    positions: CubePosition[],
    iterations: number
  ): Promise<RenderingMetrics> {
    const results: RenderingMetrics[] = [];

    for (let i = 0; i < iterations; i++) {
      const metrics = renderer.renderCubes(colors, positions);
      results.push(metrics);

      // フレーム間の待機
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    renderer.cleanup();

    // 平均値を計算
    return {
      renderTime:
        results.reduce((sum, r) => sum + r.renderTime, 0) / results.length,
      memoryUsage:
        results.reduce((sum, r) => sum + (r.memoryUsage || 0), 0) /
        results.length,
      elementCount: results[0].elementCount,
      frameRate:
        results.reduce((sum, r) => sum + (r.frameRate || 0), 0) /
        results.length,
    };
  }

  private analyzeResults(
    canvas: RenderingMetrics,
    svg: RenderingMetrics,
    css: RenderingMetrics
  ): ComparisonResults {
    const performanceRatio = {
      svgVsCanvas:
        svg.renderTime > 0 && canvas.renderTime > 0
          ? canvas.renderTime / svg.renderTime
          : 1,
      cssVsCanvas:
        css.renderTime > 0 && canvas.renderTime > 0
          ? canvas.renderTime / css.renderTime
          : 1,
      cssVsSvg:
        css.renderTime > 0 && svg.renderTime > 0
          ? svg.renderTime / css.renderTime
          : 1,
    };

    // 勝者を決定（レンダリング時間ベース）
    const times = [
      { method: 'canvas' as const, time: canvas.renderTime },
      { method: 'svg' as const, time: svg.renderTime },
      { method: 'css' as const, time: css.renderTime },
    ];
    const winner = times.sort((a, b) => a.time - b.time)[0].method;

    // 推奨事項を生成
    const recommendations = this.generateRecommendations(
      canvas,
      svg,
      css,
      performanceRatio
    );

    return {
      canvas,
      svg,
      css,
      winner,
      performanceRatio,
      recommendations,
    };
  }

  private generateRecommendations(
    canvas: RenderingMetrics,
    svg: RenderingMetrics,
    css: RenderingMetrics,
    ratio: { svgVsCanvas: number; cssVsCanvas: number; cssVsSvg: number }
  ): string[] {
    const recommendations: string[] = [];

    // パフォーマンス基準の推奨
    if (
      canvas.renderTime < svg.renderTime &&
      canvas.renderTime < css.renderTime
    ) {
      recommendations.push('高性能が必要な場合はCanvas 2Dを推奨');
    }

    if (svg.frameRate && svg.frameRate > 30) {
      recommendations.push(
        'ベクター品質とアニメーションが必要な場合はSVGを推奨'
      );
    }

    if (css.memoryUsage < canvas.memoryUsage * 0.8) {
      recommendations.push('メモリ効率を重視する場合はCSS Transformを推奨');
    }

    // メモリ使用量の分析
    const memoryOrder = [canvas, svg, css]
      .map((metrics, index) => ({
        method: ['Canvas', 'SVG', 'CSS'][index],
        memory: metrics.memoryUsage,
      }))
      .sort((a, b) => a.memory - b.memory);

    recommendations.push(
      `メモリ使用量: ${memoryOrder.map((m) => m.method).join(' < ')}`
    );

    // スケーラビリティの推奨
    if (canvas.elementCount > 50) {
      recommendations.push('大量の立方体（50+）表示時はCanvas 2Dが有利');
    }

    if (svg.elementCount <= 20) {
      recommendations.push(
        '少数の立方体（20未満）でアニメーションが必要な場合はSVGが最適'
      );
    }

    return recommendations;
  }

  // 段階的負荷テスト
  async performScalabilityTest(baseColors: CubeColor[]): Promise<{
    canvas: RenderingMetrics[];
    svg: RenderingMetrics[];
    css: RenderingMetrics[];
    scales: number[];
  }> {
    const scales = [5, 10, 25, 50, 100];
    const results = {
      canvas: [] as RenderingMetrics[],
      svg: [] as RenderingMetrics[],
      css: [] as RenderingMetrics[],
      scales,
    };

    for (const scale of scales) {
      const colors = Array.from(
        { length: scale },
        (_, i) => baseColors[i % baseColors.length]
      );
      const positions = Array.from({ length: scale }, (_, i) => ({
        x: 50 + (i % 10) * 80,
        y: 50 + Math.floor(i / 10) * 80,
        size: 40,
      }));

      const comparison = await this.compareRenderingMethods(
        colors,
        positions,
        3
      );
      results.canvas.push(comparison.canvas);
      results.svg.push(comparison.svg);
      results.css.push(comparison.css);
    }

    return results;
  }
}

// テスト用データ生成
export function generateTestColors(count: number): CubeColor[] {
  return Array.from({ length: count }, (_, i) => ({
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
    brightness: Math.random(),
  }));
}

export function generateTestPositions(
  count: number,
  containerWidth = 800,
  containerHeight = 600
): CubePosition[] {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellWidth = containerWidth / cols;
  const cellHeight = containerHeight / rows;

  return Array.from({ length: count }, (_, i) => ({
    x: (i % cols) * cellWidth + cellWidth / 2,
    y: Math.floor(i / cols) * cellHeight + cellHeight / 2,
    size: Math.min(cellWidth, cellHeight) * 0.6,
  }));
}
