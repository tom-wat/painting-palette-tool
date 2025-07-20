import { Canvas2DRenderer } from './canvas2d-renderer.js';
import type { ColorData } from './types.js';

// サンプル色データ（6面に適用するため増量）
const sampleColors: ColorData[] = [
  // ハイライト色（明度高い）
  { rgb: [255, 230, 150], hex: '#FFE696', luminance: 0.9, role: 'highlight' },
  { rgb: [240, 200, 120], hex: '#F0C878', luminance: 0.8, role: 'highlight' },
  { rgb: [220, 180, 100], hex: '#DCB464', luminance: 0.7, role: 'highlight' },

  // ミッドトーン色（中間明度）
  { rgb: [180, 140, 80], hex: '#B48C50', luminance: 0.5, role: 'midtone' },
  { rgb: [150, 110, 70], hex: '#966E46', luminance: 0.4, role: 'midtone' },
  { rgb: [120, 90, 60], hex: '#785A3C', luminance: 0.35, role: 'midtone' },

  // シャドウ色（明度低い）
  { rgb: [100, 70, 50], hex: '#644632', luminance: 0.25, role: 'shadow' },
  { rgb: [80, 55, 40], hex: '#503728', luminance: 0.2, role: 'shadow' },
  { rgb: [60, 40, 30], hex: '#3C281E', luminance: 0.15, role: 'shadow' },
  { rgb: [40, 25, 20], hex: '#281914', luminance: 0.1, role: 'shadow' },
];

class RenderingExperiment {
  private canvas2dRenderer: Canvas2DRenderer | null = null;
  private isRunning = false;

  constructor() {
    this.setupUI();
  }

  private setupUI(): void {
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const benchmarkBtn = document.getElementById(
      'benchmarkBtn'
    ) as HTMLButtonElement;
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

    startBtn.addEventListener('click', () => this.toggleRendering());
    benchmarkBtn.addEventListener('click', () => this.runBenchmark());
    resetBtn.addEventListener('click', () => this.reset());

    // Canvas 2D レンダラーの初期化
    const canvas2d = document.getElementById('canvas2d') as HTMLCanvasElement;
    this.canvas2dRenderer = new Canvas2DRenderer(canvas2d);

    // メトリクス更新のタイマー
    setInterval(() => this.updateMetrics(), 100);
  }

  private toggleRendering(): void {
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;

    if (this.isRunning) {
      this.stopRendering();
      startBtn.textContent = 'レンダリング開始';
      this.isRunning = false;
    } else {
      this.startRendering();
      startBtn.textContent = 'レンダリング停止';
      this.isRunning = true;
    }
  }

  private startRendering(): void {
    if (this.canvas2dRenderer) {
      this.canvas2dRenderer.start(sampleColors);
    }
  }

  private stopRendering(): void {
    if (this.canvas2dRenderer) {
      this.canvas2dRenderer.stop();
    }
  }

  private updateMetrics(): void {
    if (!this.isRunning) return;

    if (this.canvas2dRenderer) {
      const metrics = this.canvas2dRenderer.getMetrics();
      const metricsDiv = document.getElementById('metrics2d');
      if (metricsDiv) {
        metricsDiv.innerHTML = `
          FPS: ${metrics.fps.toFixed(1)}<br>
          Render Time: ${metrics.renderTime.toFixed(2)}ms<br>
          Memory: ${metrics.memoryUsage.toFixed(1)}MB
        `;
      }
    }
  }

  private async runBenchmark(): Promise<void> {
    const benchmarkBtn = document.getElementById(
      'benchmarkBtn'
    ) as HTMLButtonElement;
    const benchmarkOutput = document.getElementById('benchmarkOutput');

    if (!benchmarkOutput) return;

    benchmarkBtn.disabled = true;
    benchmarkOutput.innerHTML = 'ベンチマーク実行中...';

    try {
      const results: any[] = [];

      // Canvas 2D ベンチマーク
      if (this.canvas2dRenderer) {
        const result = await this.benchmarkRenderer(
          'Canvas 2D',
          this.canvas2dRenderer
        );
        results.push(result);
      }

      // 結果表示
      let resultHTML = '<h4>ベンチマーク結果</h4>';
      results.forEach((result) => {
        resultHTML += `
          <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
            <strong>${result.renderer}</strong><br>
            平均FPS: ${result.avgFps.toFixed(1)}<br>
            平均描画時間: ${result.avgRenderTime.toFixed(2)}ms<br>
            最大メモリ: ${result.maxMemory.toFixed(1)}MB<br>
            安定性: ${result.stability.toFixed(2)}
          </div>
        `;
      });

      benchmarkOutput.innerHTML = resultHTML;
    } catch (error) {
      benchmarkOutput.innerHTML = `エラーが発生しました: ${error}`;
    } finally {
      benchmarkBtn.disabled = false;
    }
  }

  private async benchmarkRenderer(
    name: string,
    renderer: Canvas2DRenderer
  ): Promise<any> {
    const duration = 3000; // 3秒間測定
    const measurements: { fps: number; renderTime: number; memory: number }[] =
      [];

    return new Promise((resolve) => {
      renderer.start(sampleColors);

      const interval = setInterval(() => {
        const metrics = renderer.getMetrics();
        measurements.push({
          fps: metrics.fps,
          renderTime: metrics.renderTime,
          memory: metrics.memoryUsage,
        });
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        renderer.stop();

        // 統計計算
        const avgFps =
          measurements.reduce((sum, m) => sum + m.fps, 0) / measurements.length;
        const avgRenderTime =
          measurements.reduce((sum, m) => sum + m.renderTime, 0) /
          measurements.length;
        const maxMemory = Math.max(...measurements.map((m) => m.memory));

        // FPSの分散（安定性）
        const fpsVariance =
          measurements.reduce(
            (sum, m) => sum + Math.pow(m.fps - avgFps, 2),
            0
          ) / measurements.length;
        const stability = 1 / (1 + Math.sqrt(fpsVariance)); // 0-1, 1が最も安定

        resolve({
          renderer: name,
          avgFps,
          avgRenderTime,
          maxMemory,
          stability,
        });
      }, duration);
    });
  }

  private reset(): void {
    this.stopRendering();
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    startBtn.textContent = 'レンダリング開始';
    this.isRunning = false;

    // メトリクスをリセット
    const metricsDiv = document.getElementById('metrics2d');
    if (metricsDiv) {
      metricsDiv.innerHTML = `
        FPS: --<br>
        Render Time: --ms<br>
        Memory: --MB
      `;
    }

    const benchmarkOutput = document.getElementById('benchmarkOutput');
    if (benchmarkOutput) {
      benchmarkOutput.innerHTML = 'ベンチマークを実行してください';
    }
  }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
  new RenderingExperiment();
});
