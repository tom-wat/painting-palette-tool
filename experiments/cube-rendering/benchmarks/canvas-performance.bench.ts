/**
 * Canvas 2D 六角形立方体の性能ベンチマーク
 */

import { describe, bench } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  Canvas2DCubeRenderer,
  CubeLayoutManager,
  HexagonCubeGeometry,
  ColorBrightnessAdjuster,
  type CubeColor,
} from '../src/hexagon-cube.js';
import { MockHTMLCanvasElement } from '../tests/canvas-mock.js';

// JSDOM環境セットアップ
const dom = new JSDOM(
  '<!DOCTYPE html><html><body><canvas id="bench-canvas" width="800" height="600"></canvas></body></html>'
);
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;

// Canvas モック設定
const mockCanvas = new MockHTMLCanvasElement();
dom.window.document.getElementById = (id: string): HTMLElement | null => {
  if (id === 'bench-canvas') {
    return mockCanvas as unknown as HTMLCanvasElement;
  }
  return null;
};

/**
 * テスト用色パレット生成
 */
function generateTestColors(count: number): CubeColor[] {
  const colors: CubeColor[] = [];
  for (let i = 0; i < count; i++) {
    colors.push({
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
      brightness: Math.random(),
    });
  }
  return colors;
}

describe('Canvas 2D Cube Rendering Performance', () => {
  const canvas = mockCanvas as unknown as HTMLCanvasElement;
  const renderer = new Canvas2DCubeRenderer(canvas);

  bench('render 10 cubes', () => {
    const colors = generateTestColors(10);
    const positions = CubeLayoutManager.calculateGridPositions(
      colors,
      800,
      600,
      40
    );
    renderer.renderCubes(colors, positions);
  });

  bench('render 25 cubes', () => {
    const colors = generateTestColors(25);
    const positions = CubeLayoutManager.calculateGridPositions(
      colors,
      800,
      600,
      35
    );
    renderer.renderCubes(colors, positions);
  });

  bench('render 50 cubes', () => {
    const colors = generateTestColors(50);
    const positions = CubeLayoutManager.calculateGridPositions(
      colors,
      800,
      600,
      30
    );
    renderer.renderCubes(colors, positions);
  });

  bench('render 100 cubes', () => {
    const colors = generateTestColors(100);
    const positions = CubeLayoutManager.calculateGridPositions(
      colors,
      800,
      600,
      25
    );
    renderer.renderCubes(colors, positions);
  });
});

describe('Geometry Calculation Performance', () => {
  bench('calculate hexagon vertices', () => {
    for (let i = 0; i < 1000; i++) {
      HexagonCubeGeometry.getHexagonVertices(
        Math.random() * 800,
        Math.random() * 600,
        20 + Math.random() * 40
      );
    }
  });

  bench('calculate cube faces', () => {
    for (let i = 0; i < 1000; i++) {
      HexagonCubeGeometry.getCubeFaces(
        Math.random() * 800,
        Math.random() * 600,
        20 + Math.random() * 40
      );
    }
  });
});

describe('Color Processing Performance', () => {
  bench('generate cube face colors', () => {
    for (let i = 0; i < 1000; i++) {
      ColorBrightnessAdjuster.generateCubeFaceColors({
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256),
        brightness: Math.random(),
      });
    }
  });

  bench('calculate perceptual brightness', () => {
    for (let i = 0; i < 1000; i++) {
      ColorBrightnessAdjuster.getPerceptualBrightness(
        Math.random(),
        Math.random(),
        Math.random()
      );
    }
  });
});

describe('Layout Calculation Performance', () => {
  const testColors = generateTestColors(100);

  bench('grid layout calculation - 100 cubes', () => {
    CubeLayoutManager.calculateGridPositions(testColors, 800, 600, 30);
  });

  bench('circular layout calculation - 100 cubes', () => {
    CubeLayoutManager.calculateCircularPositions(testColors, 400, 300, 200, 30);
  });

  bench('grid layout calculation - 25 cubes', () => {
    const colors = testColors.slice(0, 25);
    CubeLayoutManager.calculateGridPositions(colors, 800, 600, 40);
  });

  bench('circular layout calculation - 25 cubes', () => {
    const colors = testColors.slice(0, 25);
    CubeLayoutManager.calculateCircularPositions(colors, 400, 300, 200, 40);
  });
});

describe('Memory Usage Simulation', () => {
  bench('create and destroy renderers', () => {
    const canvas = new MockHTMLCanvasElement();
    canvas.width = 800;
    canvas.height = 600;

    const renderer = new Canvas2DCubeRenderer(
      canvas as unknown as HTMLCanvasElement
    );
    const colors = generateTestColors(50);
    const positions = CubeLayoutManager.calculateGridPositions(
      colors,
      800,
      600,
      30
    );

    renderer.renderCubes(colors, positions);

    // メモリ解放のシミュレーション
    canvas.width = 1;
    canvas.height = 1;
  });

  bench('large color palette processing', () => {
    const colors = generateTestColors(500);
    const positions = CubeLayoutManager.calculateGridPositions(
      colors,
      1600,
      1200,
      20
    );

    // 実際の描画は行わず、計算のみ
    colors.forEach((color) => {
      ColorBrightnessAdjuster.generateCubeFaceColors(color);
    });
  });
});
