/**
 * 2D描画手法性能ベンチマーク
 */

import { describe, bench } from 'vitest';
import {
  RenderingComparison,
  CanvasRenderer,
  SvgRenderer,
  CssRenderer,
  generateTestColors,
  generateTestPositions,
} from '../src/rendering-comparison.js';

// テストデータの準備
const testScales = [5, 10, 25, 50];
const testData = testScales.map((scale) => ({
  scale,
  colors: generateTestColors(scale),
  positions: generateTestPositions(scale),
}));

describe('個別レンダラー性能', () => {
  testData.forEach(({ scale, colors, positions }) => {
    describe(`${scale}立方体レンダリング`, () => {
      bench(`Canvas - ${scale}立方体`, () => {
        const container = document.createElement('div');
        container.style.cssText =
          'width: 800px; height: 600px; position: absolute; top: -9999px';
        document.body.appendChild(container);

        const renderer = new CanvasRenderer(container);
        renderer.renderCubes(colors, positions);
        renderer.cleanup();

        container.remove();
      });

      bench(`SVG - ${scale}立方体`, () => {
        const container = document.createElement('div');
        container.style.cssText =
          'width: 800px; height: 600px; position: absolute; top: -9999px';
        document.body.appendChild(container);

        const renderer = new SvgRenderer(container);
        renderer.renderCubes(colors, positions);
        renderer.cleanup();

        container.remove();
      });

      bench(`CSS Transform - ${scale}立方体`, () => {
        const container = document.createElement('div');
        container.style.cssText =
          'width: 800px; height: 600px; position: absolute; top: -9999px';
        document.body.appendChild(container);

        const renderer = new CssRenderer(container);
        renderer.renderCubes(colors, positions);
        renderer.cleanup();

        container.remove();
      });
    });
  });
});

describe('レンダリング手法比較', () => {
  const comparison = new RenderingComparison();

  testData.forEach(({ scale, colors, positions }) => {
    bench(`包括的比較 - ${scale}立方体`, async () => {
      await comparison.compareRenderingMethods(colors, positions, 1);
    });
  });
});

describe('メモリ効率性', () => {
  const largeDataset = {
    colors: generateTestColors(100),
    positions: generateTestPositions(100),
  };

  bench('Canvas - メモリ使用量測定', () => {
    const container = document.createElement('div');
    container.style.cssText =
      'width: 800px; height: 600px; position: absolute; top: -9999px';
    document.body.appendChild(container);

    const renderer = new CanvasRenderer(container);
    const metrics = renderer.renderCubes(
      largeDataset.colors,
      largeDataset.positions
    );

    // メモリ使用量の記録（ベンチマーク内では検証不要）
    // expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);

    renderer.cleanup();
    container.remove();
  });

  bench('SVG - DOM要素数最適化', () => {
    const container = document.createElement('div');
    container.style.cssText =
      'width: 800px; height: 600px; position: absolute; top: -9999px';
    document.body.appendChild(container);

    const renderer = new SvgRenderer(container);
    renderer.renderCubes(largeDataset.colors, largeDataset.positions);

    // DOM要素数を確認（ベンチマーク内では検証不要）
    const svg = container.querySelector('svg');
    const elementCount = svg?.querySelectorAll('*').length || 0;
    // expect(elementCount).toBeGreaterThan(0);

    renderer.cleanup();
    container.remove();
  });

  bench('CSS - GPU層作成効率', () => {
    const container = document.createElement('div');
    container.style.cssText =
      'width: 800px; height: 600px; position: absolute; top: -9999px';
    document.body.appendChild(container);

    const renderer = new CssRenderer(container);
    const metrics = renderer.renderCubes(
      largeDataset.colors,
      largeDataset.positions
    );

    // レンダリング時間とメモリ効率の確認（ベンチマーク内では検証不要）
    // expect(metrics.renderTime).toBeGreaterThanOrEqual(0);
    // expect(metrics.elementCount).toBe(100);

    renderer.cleanup();
    container.remove();
  });
});

describe('フレームレート分析', () => {
  const animationData = {
    colors: generateTestColors(20),
    positions: generateTestPositions(20),
  };

  bench('Canvas - 高フレームレート描画', () => {
    const container = document.createElement('div');
    container.style.cssText =
      'width: 800px; height: 600px; position: absolute; top: -9999px';
    document.body.appendChild(container);

    const renderer = new CanvasRenderer(container);

    // 複数フレームのシミュレーション
    for (let frame = 0; frame < 10; frame++) {
      renderer.renderCubes(animationData.colors, animationData.positions);
    }

    renderer.cleanup();
    container.remove();
  });

  bench('SVG - アニメーション対応描画', () => {
    const container = document.createElement('div');
    container.style.cssText =
      'width: 800px; height: 600px; position: absolute; top: -9999px';
    document.body.appendChild(container);

    const renderer = new SvgRenderer(container);

    // アニメーションフレームのシミュレーション
    for (let frame = 0; frame < 10; frame++) {
      // 位置を少しずつ変更
      const animatedPositions = animationData.positions.map((pos) => ({
        ...pos,
        x: pos.x + Math.sin(frame * 0.1) * 5,
      }));

      renderer.renderCubes(animationData.colors, animatedPositions);
    }

    renderer.cleanup();
    container.remove();
  });

  bench('CSS - ハードウェアアクセラレーション', () => {
    const container = document.createElement('div');
    container.style.cssText =
      'width: 800px; height: 600px; position: absolute; top: -9999px';
    document.body.appendChild(container);

    const renderer = new CssRenderer(container);

    // GPU層を活用したアニメーション
    for (let frame = 0; frame < 10; frame++) {
      renderer.renderCubes(animationData.colors, animationData.positions);
    }

    renderer.cleanup();
    container.remove();
  });
});

describe('スケーラビリティテスト', () => {
  const comparison = new RenderingComparison();

  bench('包括的スケーラビリティ分析', async () => {
    const baseColors = generateTestColors(8);
    await comparison.performScalabilityTest(baseColors);
  });

  bench('極限スケール - 200立方体', () => {
    const extremeScale = {
      colors: generateTestColors(200),
      positions: generateTestPositions(200, 1600, 1200),
    };

    const container = document.createElement('div');
    container.style.cssText =
      'width: 1600px; height: 1200px; position: absolute; top: -9999px';
    document.body.appendChild(container);

    // Canvas での極限テスト
    const canvasRenderer = new CanvasRenderer(container);
    const canvasMetrics = canvasRenderer.renderCubes(
      extremeScale.colors,
      extremeScale.positions
    );
    canvasRenderer.cleanup();

    // 結果の検証（ベンチマーク内では検証不要）
    // expect(canvasMetrics.elementCount).toBe(200);
    // expect(canvasMetrics.renderTime).toBeGreaterThan(0);

    container.remove();
  });
});
