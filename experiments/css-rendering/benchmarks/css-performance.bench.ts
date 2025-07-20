/**
 * CSS Transform立方体レンダリング性能ベンチマーク
 */

import { bench, describe } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  CssCubeGeometry,
  CssCubeColorAdjuster,
  CssCubeRenderer,
  CssCubeLayoutManager,
  type CubeColor,
  type CubePosition,
} from '../src/css-cube.js';

// DOM環境のセットアップ
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;
global.HTMLElement = dom.window.HTMLElement;

// テストデータ生成
function generateTestColors(count: number): CubeColor[] {
  return Array.from({ length: count }, (_, i) => ({
    r: Math.floor((i * 137.5) % 256),
    g: Math.floor((i * 197.3) % 256),
    b: Math.floor((i * 241.7) % 256),
    brightness: (i % 100) / 100,
  }));
}

function generateTestPositions(count: number): CubePosition[] {
  return Array.from({ length: count }, (_, i) => {
    const cols = Math.ceil(Math.sqrt(count));
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      x: col * 100 + 50,
      y: row * 100 + 50,
      size: 30,
    };
  });
}

// ベンチマーク用コンテナ作成
function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  container.style.position = 'relative';
  document.body.appendChild(container);
  return container;
}

describe('CSS Geometry Calculations', () => {
  const centerX = 100,
    centerY = 100,
    size = 50;

  bench('Face vertices calculation', () => {
    CssCubeGeometry.calculateFaceVertices(centerX, centerY, size);
  });

  bench('CSS Transform values calculation', () => {
    CssCubeGeometry.calculateTransforms(centerX, centerY, size);
  });

  bench('Batch geometry calculation (100 cubes)', () => {
    for (let i = 0; i < 100; i++) {
      CssCubeGeometry.calculateFaceVertices(i * 10, i * 10, size);
      CssCubeGeometry.calculateTransforms(i * 10, i * 10, size);
    }
  });
});

describe('Color Processing', () => {
  const testColors = generateTestColors(100);

  bench('Perceptual brightness calculation', () => {
    testColors.forEach((color) => {
      CssCubeColorAdjuster.getPerceptualBrightness(color.r, color.g, color.b);
    });
  });

  bench('CSS cube face colors generation', () => {
    testColors.forEach((color) => {
      CssCubeColorAdjuster.generateCubeFaceColors(color);
    });
  });

  bench('Batch color processing (100 colors)', () => {
    testColors.forEach((color) => {
      const faceColors = CssCubeColorAdjuster.generateCubeFaceColors(color);
      // 色の使用をシミュレート
      JSON.stringify(faceColors);
    });
  });
});

describe('Layout Calculations', () => {
  const small = generateTestColors(10);
  const medium = generateTestColors(50);
  const large = generateTestColors(100);

  bench('Grid layout - 10 cubes', () => {
    CssCubeLayoutManager.calculateGridPositions(small, 800, 600, 40);
  });

  bench('Grid layout - 50 cubes', () => {
    CssCubeLayoutManager.calculateGridPositions(medium, 800, 600, 40);
  });

  bench('Grid layout - 100 cubes', () => {
    CssCubeLayoutManager.calculateGridPositions(large, 800, 600, 40);
  });

  bench('Circular layout - 10 cubes', () => {
    CssCubeLayoutManager.calculateCircularPositions(small, 400, 300, 200, 40);
  });

  bench('Circular layout - 50 cubes', () => {
    CssCubeLayoutManager.calculateCircularPositions(medium, 400, 300, 200, 40);
  });

  bench('Circular layout - 100 cubes', () => {
    CssCubeLayoutManager.calculateCircularPositions(large, 400, 300, 200, 40);
  });

  bench('Spiral layout - 10 cubes', () => {
    CssCubeLayoutManager.calculateSpiralPositions(small, 400, 300, 50, 40);
  });

  bench('Spiral layout - 50 cubes', () => {
    CssCubeLayoutManager.calculateSpiralPositions(medium, 400, 300, 50, 40);
  });

  bench('Spiral layout - 100 cubes', () => {
    CssCubeLayoutManager.calculateSpiralPositions(large, 400, 300, 50, 40);
  });
});

describe('CSS Rendering Performance', () => {
  const small = generateTestColors(10);
  const medium = generateTestColors(50);
  const large = generateTestColors(100);
  const extraLarge = generateTestColors(200);

  const smallPositions = generateTestPositions(10);
  const mediumPositions = generateTestPositions(50);
  const largePositions = generateTestPositions(100);
  const extraLargePositions = generateTestPositions(200);

  bench('CSS rendering - 10 cubes', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container);
    renderer.renderCubes(small, smallPositions);
    container.remove();
  });

  bench('CSS rendering - 50 cubes', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container);
    renderer.renderCubes(medium, mediumPositions);
    container.remove();
  });

  bench('CSS rendering - 100 cubes', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container);
    renderer.renderCubes(large, largePositions);
    container.remove();
  });

  bench('CSS rendering - 200 cubes', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container);
    renderer.renderCubes(extraLarge, extraLargePositions);
    container.remove();
  });

  bench('CSS rendering with hardware acceleration disabled - 50 cubes', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container, {
      enableHardwareAcceleration: false,
    });
    renderer.renderCubes(medium, mediumPositions);
    container.remove();
  });

  bench('CSS rendering with mobile optimization - 50 cubes', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container, {
      optimizeForMobile: true,
      useWillChange: true,
    });
    renderer.renderCubes(medium, mediumPositions);
    container.remove();
  });

  bench('CSS rendering with 3D transforms disabled - 50 cubes', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container, {
      enable3dTransforms: false,
    });
    renderer.renderCubes(medium, mediumPositions);
    container.remove();
  });
});

describe('DOM Operations and Memory', () => {
  const testColors = generateTestColors(100);
  const testPositions = generateTestPositions(100);

  bench('DOM element creation (100 groups x 3 faces)', () => {
    const container = createContainer();

    for (let i = 0; i < 100; i++) {
      const group = document.createElement('div');
      group.className = 'css-cube-group';

      for (let j = 0; j < 3; j++) {
        const face = document.createElement('div');
        face.className = 'css-cube-face';
        face.style.width = '40px';
        face.style.height = '40px';
        face.style.backgroundColor = `rgb(${i}, ${j * 50}, 128)`;
        face.style.position = 'absolute';
        group.appendChild(face);
      }

      container.appendChild(group);
    }

    container.remove();
  });

  bench('CSS transform application (100 elements)', () => {
    const container = createContainer();
    const elements = [];

    // セットアップ
    for (let i = 0; i < 100; i++) {
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.width = '40px';
      element.style.height = '40px';
      container.appendChild(element);
      elements.push(element);
    }

    // Transform適用
    elements.forEach((element, i) => {
      element.style.transform = `translate3d(${i * 50}px, ${i * 30}px, 0) rotateX(-60deg)`;
    });

    container.remove();
  });

  bench('CSS cleanup (100 cube groups)', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container);

    // セットアップ
    renderer.renderCubes(testColors, testPositions);

    // クリーンアップ
    renderer.clearCubes();
    container.remove();
  });

  bench('CSS animated cleanup (100 cube groups)', async () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container);

    // セットアップ
    renderer.renderCubes(testColors, testPositions);

    // アニメーション付きクリーンアップ
    await renderer.clearWithAnimation(100);
    container.remove();
  });
});

describe('Hardware Acceleration Comparison', () => {
  const testColors = generateTestColors(50);
  const testPositions = generateTestPositions(50);

  bench('Rendering with GPU acceleration enabled', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container, {
      enableHardwareAcceleration: true,
      useWillChange: true,
    });
    renderer.renderCubes(testColors, testPositions);
    container.remove();
  });

  bench('Rendering with GPU acceleration disabled', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container, {
      enableHardwareAcceleration: false,
      useWillChange: false,
    });
    renderer.renderCubes(testColors, testPositions);
    container.remove();
  });

  bench('Transform update with will-change', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container, { useWillChange: true });
    renderer.renderCubes(testColors, testPositions);

    // Transform更新をシミュレート
    const cubes = container.querySelectorAll('.css-cube-group');
    cubes.forEach((cube, i) => {
      (cube as HTMLElement).style.transform +=
        ` scale3d(${1 + i * 0.1}, ${1 + i * 0.1}, ${1 + i * 0.1})`;
    });

    container.remove();
  });

  bench('Transform update without will-change', () => {
    const container = createContainer();
    const renderer = new CssCubeRenderer(container, { useWillChange: false });
    renderer.renderCubes(testColors, testPositions);

    // Transform更新をシミュレート
    const cubes = container.querySelectorAll('.css-cube-group');
    cubes.forEach((cube, i) => {
      (cube as HTMLElement).style.transform +=
        ` scale3d(${1 + i * 0.1}, ${1 + i * 0.1}, ${1 + i * 0.1})`;
    });

    container.remove();
  });
});

describe('Scaling Performance Comparison', () => {
  const cubeCounts = [5, 10, 25, 50, 100];

  cubeCounts.forEach((count) => {
    const colors = generateTestColors(count);
    const positions = generateTestPositions(count);

    bench(`CSS Transform - ${count} cubes`, () => {
      const container = createContainer();
      const renderer = new CssCubeRenderer(container);
      renderer.renderCubes(colors, positions);
      container.remove();
    });

    bench(`CSS Transform (optimized) - ${count} cubes`, () => {
      const container = createContainer();
      const renderer = new CssCubeRenderer(container, {
        enableHardwareAcceleration: true,
        useWillChange: true,
        optimizeForMobile: true,
      });
      renderer.renderCubes(colors, positions);
      container.remove();
    });
  });
});

describe('Real-world Usage Simulation', () => {
  bench('Complete workflow: layout → render → cleanup', () => {
    const colors = generateTestColors(25);

    // 1. レイアウト計算
    const gridPositions = CssCubeLayoutManager.calculateGridPositions(
      colors,
      800,
      600,
      40
    );

    // 2. レンダリング
    const container = createContainer();
    const renderer = new CssCubeRenderer(container);
    renderer.renderCubes(colors, gridPositions);

    // 3. クリーンアップ
    renderer.clearCubes();
    container.remove();
  });

  bench('Interactive workflow: render → hover → update → cleanup', () => {
    const colors = generateTestColors(20);
    const positions = generateTestPositions(20);

    const container = createContainer();
    const renderer = new CssCubeRenderer(container);

    // 初期レンダリング
    renderer.renderCubes(colors, positions);

    // ホバー効果をシミュレート
    const cubes = container.querySelectorAll('.css-cube-group');
    cubes.forEach((cube) => {
      (cube as HTMLElement).style.transform += ' scale3d(1.1, 1.1, 1.1)';
      const faces = cube.querySelectorAll('.css-cube-face');
      faces.forEach((face) => {
        (face as HTMLElement).style.filter = 'brightness(1.2)';
      });
    });

    // 元に戻す
    cubes.forEach((cube) => {
      const element = cube as HTMLElement;
      element.style.transform = element.style.transform.replace(
        ' scale3d(1.1, 1.1, 1.1)',
        ''
      );
      const faces = cube.querySelectorAll('.css-cube-face');
      faces.forEach((face) => {
        (face as HTMLElement).style.filter = 'none';
      });
    });

    // クリーンアップ
    renderer.clearCubes();
    container.remove();
  });

  bench('Configuration update workflow', () => {
    const colors = generateTestColors(30);
    const positions = CssCubeLayoutManager.calculateCircularPositions(
      colors,
      400,
      300,
      150,
      35
    );

    const container = createContainer();
    const renderer = new CssCubeRenderer(container);

    // レンダリング
    renderer.renderCubes(colors, positions);

    // 設定変更
    renderer.updateConfig({ enableHardwareAcceleration: false });
    renderer.updateConfig({ useWillChange: false });
    renderer.updateConfig({ optimizeForMobile: true });

    // パフォーマンス測定
    renderer.measurePerformance();

    // クリーンアップ
    renderer.clearCubes();
    container.remove();
  });
});
