/**
 * 2D描画手法性能比較のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RenderingComparison,
  CanvasRenderer,
  SvgRenderer,
  CssRenderer,
  generateTestColors,
  generateTestPositions,
  type CubeColor,
  type CubePosition,
} from '../src/rendering-comparison.js';

describe('generateTestColors', () => {
  it('指定された数の色を生成する', () => {
    const colors = generateTestColors(5);
    expect(colors).toHaveLength(5);

    colors.forEach((color) => {
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(255);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(255);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(255);
      expect(color.brightness).toBeGreaterThanOrEqual(0);
      expect(color.brightness).toBeLessThanOrEqual(1);
    });
  });
});

describe('generateTestPositions', () => {
  it('グリッド配置の位置を生成する', () => {
    const positions = generateTestPositions(6, 800, 600);
    expect(positions).toHaveLength(6);

    positions.forEach((pos) => {
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.x).toBeLessThan(800);
      expect(pos.y).toBeGreaterThan(0);
      expect(pos.y).toBeLessThan(600);
      expect(pos.size).toBeGreaterThan(0);
    });
  });

  it('位置が重複しないようにグリッド配置される', () => {
    const positions = generateTestPositions(4, 400, 400);

    // 各位置が異なることを確認（Y座標またはX座標で）
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        expect(
          positions[i].x !== positions[j].x || positions[i].y !== positions[j].y
        ).toBe(true);
      }
    }
  });
});

describe('CanvasRenderer', () => {
  let container: HTMLElement;
  let renderer: CanvasRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    renderer = new CanvasRenderer(container);
  });

  it('Canvas要素が作成される', () => {
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    expect(canvas?.width).toBe(800);
    expect(canvas?.height).toBe(600);
  });

  it('立方体をレンダリングしてメトリクスを返す', () => {
    const colors: CubeColor[] = [{ r: 255, g: 100, b: 50, brightness: 0.6 }];
    const positions: CubePosition[] = [{ x: 100, y: 100, size: 50 }];

    const metrics = renderer.renderCubes(colors, positions);

    expect(metrics.renderTime).toBeGreaterThanOrEqual(0);
    expect(metrics.elementCount).toBe(1);
    expect(metrics.frameRate).toBeGreaterThanOrEqual(0);
  });

  it('複数の立方体をレンダリングできる', () => {
    const colors = generateTestColors(5);
    const positions = generateTestPositions(5);

    const metrics = renderer.renderCubes(colors, positions);

    expect(metrics.elementCount).toBe(5);
    expect(metrics.renderTime).toBeGreaterThanOrEqual(0);
  });

  it('クリーンアップが機能する', () => {
    expect(container.querySelector('canvas')).toBeTruthy();

    renderer.cleanup();

    expect(container.querySelector('canvas')).toBeFalsy();
  });
});

describe('SvgRenderer', () => {
  let container: HTMLElement;
  let renderer: SvgRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    renderer = new SvgRenderer(container);
  });

  it('SVG要素が作成される', () => {
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('width')).toBe('800');
    expect(svg?.getAttribute('height')).toBe('600');
  });

  it('立方体をレンダリングしてメトリクスを返す', () => {
    const colors: CubeColor[] = [{ r: 100, g: 200, b: 150, brightness: 0.7 }];
    const positions: CubePosition[] = [{ x: 150, y: 120, size: 60 }];

    const metrics = renderer.renderCubes(colors, positions);

    expect(metrics.renderTime).toBeGreaterThanOrEqual(0);
    expect(metrics.elementCount).toBe(1);
    expect(metrics.frameRate).toBeGreaterThanOrEqual(0);

    // SVG要素が作成されていることを確認
    const svg = container.querySelector('svg');
    const groups = svg?.querySelectorAll('g');
    expect(groups?.length).toBe(1);
  });

  it('複数回のレンダリングで既存要素がクリアされる', () => {
    const colors = generateTestColors(2);
    const positions = generateTestPositions(2);

    renderer.renderCubes(colors, positions);
    const svg = container.querySelector('svg');
    expect(svg?.children.length).toBe(2);

    renderer.renderCubes([colors[0]], [positions[0]]);
    expect(svg?.children.length).toBe(1);
  });

  it('クリーンアップが機能する', () => {
    expect(container.querySelector('svg')).toBeTruthy();

    renderer.cleanup();

    expect(container.querySelector('svg')).toBeFalsy();
  });
});

describe('CssRenderer', () => {
  let container: HTMLElement;
  let renderer: CssRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    renderer = new CssRenderer(container);
  });

  it('CSS Transform コンテナが作成される', () => {
    const cubeContainer = container.querySelector('div');
    expect(cubeContainer).toBeTruthy();
    expect(cubeContainer?.style.perspective).toBe('1000px');
    expect(cubeContainer?.style.transformStyle).toBe('preserve-3d');
  });

  it('立方体をレンダリングしてメトリクスを返す', () => {
    const colors: CubeColor[] = [{ r: 50, g: 150, b: 200, brightness: 0.5 }];
    const positions: CubePosition[] = [{ x: 200, y: 150, size: 40 }];

    const metrics = renderer.renderCubes(colors, positions);

    expect(metrics.renderTime).toBeGreaterThanOrEqual(0);
    expect(metrics.elementCount).toBe(1);
    expect(metrics.frameRate).toBeGreaterThanOrEqual(0);

    // CSS立方体要素が作成されていることを確認
    const cubeContainer = container.querySelector('div');
    expect(cubeContainer).toBeTruthy();
    const cubeGroup = cubeContainer?.children[0];
    expect(cubeGroup?.children.length).toBe(3); // 3つの面
  });

  it('複数の立方体のCSS Transform が正しく設定される', () => {
    const colors = generateTestColors(3);
    const positions = generateTestPositions(3);

    renderer.renderCubes(colors, positions);

    const cubeContainer = container.querySelector('div');
    const cubeGroups = cubeContainer?.children;
    expect(cubeGroups?.length).toBe(3);

    Array.from(cubeGroups || []).forEach((group, index) => {
      const element = group as HTMLElement;
      expect(element.style.transform).toContain('translate3d');
      expect(element.style.transformStyle).toBe('preserve-3d');

      // 各立方体グループに3つの面があることを確認
      expect(element.children.length).toBe(3);
    });
  });

  it('クリーンアップが機能する', () => {
    expect(container.children.length).toBe(1);

    renderer.cleanup();

    expect(container.children.length).toBe(0);
  });
});

describe('RenderingComparison', () => {
  let comparison: RenderingComparison;

  beforeEach(() => {
    comparison = new RenderingComparison();
  });

  it('3つのレンダリング手法を比較する', async () => {
    const colors = generateTestColors(3);
    const positions = generateTestPositions(3);

    const results = await comparison.compareRenderingMethods(
      colors,
      positions,
      1
    );

    expect(results.canvas).toBeDefined();
    expect(results.svg).toBeDefined();
    expect(results.css).toBeDefined();

    expect(results.canvas.renderTime).toBeGreaterThanOrEqual(0);
    expect(results.svg.renderTime).toBeGreaterThanOrEqual(0);
    expect(results.css.renderTime).toBeGreaterThanOrEqual(0);

    expect(results.canvas.elementCount).toBe(3);
    expect(results.svg.elementCount).toBe(3);
    expect(results.css.elementCount).toBe(3);

    expect(['canvas', 'svg', 'css']).toContain(results.winner);
  });

  it('パフォーマンス比率を計算する', async () => {
    const colors = generateTestColors(2);
    const positions = generateTestPositions(2);

    const results = await comparison.compareRenderingMethods(
      colors,
      positions,
      1
    );

    expect(results.performanceRatio.svgVsCanvas).toBeGreaterThan(0);
    expect(results.performanceRatio.cssVsCanvas).toBeGreaterThan(0);
    expect(results.performanceRatio.cssVsSvg).toBeGreaterThan(0);
  });

  it('推奨事項を生成する', async () => {
    const colors = generateTestColors(5);
    const positions = generateTestPositions(5);

    const results = await comparison.compareRenderingMethods(
      colors,
      positions,
      1
    );

    expect(results.recommendations).toBeInstanceOf(Array);
    expect(results.recommendations.length).toBeGreaterThan(0);

    // 推奨事項に有用な情報が含まれていることを確認
    const allRecommendations = results.recommendations.join(' ');
    expect(allRecommendations).toMatch(/(Canvas|SVG|CSS)/);
  });

  it('スケーラビリティテストを実行する', async () => {
    const baseColors = generateTestColors(3);

    const scalabilityResults =
      await comparison.performScalabilityTest(baseColors);

    expect(scalabilityResults.scales).toEqual([5, 10, 25, 50, 100]);
    expect(scalabilityResults.canvas).toHaveLength(5);
    expect(scalabilityResults.svg).toHaveLength(5);
    expect(scalabilityResults.css).toHaveLength(5);

    // 各スケールでの結果が記録されていることを確認
    scalabilityResults.canvas.forEach((metrics, index) => {
      expect(metrics.elementCount).toBe(scalabilityResults.scales[index]);
      expect(metrics.renderTime).toBeGreaterThanOrEqual(0);
    });
  });
});
