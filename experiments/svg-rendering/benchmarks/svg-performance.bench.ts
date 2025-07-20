/**
 * SVG立方体レンダリング性能ベンチマーク
 */

import { bench, describe } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  SvgCubeGeometry,
  SvgColorBrightnessAdjuster,
  SvgCubeRenderer,
  SvgCubeLayoutManager,
  CubeColor,
  CubePosition,
} from '../src/svg-cube.js';
import { EnhancedSvgCubeRenderer } from '../src/svg-cube-enhanced.js';

// DOM環境のセットアップ
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;
global.SVGElement = dom.window.SVGElement;

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

// ベンチマーク用SVG要素作成
function createSvgElement(): SVGElement {
  return document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  ) as unknown as SVGElement;
}

describe('SVG Geometry Calculations', () => {
  const centerX = 100,
    centerY = 100,
    size = 50;

  bench('Hexagon vertices calculation', () => {
    SvgCubeGeometry.getHexagonVertices(centerX, centerY, size);
  });

  bench('Hexagon path generation', () => {
    SvgCubeGeometry.getHexagonPath(centerX, centerY, size);
  });

  bench('Cube face paths generation', () => {
    SvgCubeGeometry.getCubeFacePaths(centerX, centerY, size);
  });

  bench('Batch geometry calculation (100 cubes)', () => {
    for (let i = 0; i < 100; i++) {
      SvgCubeGeometry.getCubeFacePaths(i * 10, i * 10, size);
    }
  });
});

describe('Color Processing', () => {
  const testColors = generateTestColors(100);

  bench('Perceptual brightness calculation', () => {
    testColors.forEach((color) => {
      SvgColorBrightnessAdjuster.getPerceptualBrightness(
        color.r / 255,
        color.g / 255,
        color.b / 255
      );
    });
  });

  bench('Cube face colors generation', () => {
    testColors.forEach((color) => {
      SvgColorBrightnessAdjuster.generateCubeFaceColors(color);
    });
  });

  bench('Batch color processing (100 colors)', () => {
    testColors.forEach((color) => {
      const faceColors =
        SvgColorBrightnessAdjuster.generateCubeFaceColors(color);
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
    SvgCubeLayoutManager.calculateGridPositions(small, 800, 600, 40);
  });

  bench('Grid layout - 50 cubes', () => {
    SvgCubeLayoutManager.calculateGridPositions(medium, 800, 600, 40);
  });

  bench('Grid layout - 100 cubes', () => {
    SvgCubeLayoutManager.calculateGridPositions(large, 800, 600, 40);
  });

  bench('Circular layout - 10 cubes', () => {
    SvgCubeLayoutManager.calculateCircularPositions(small, 400, 300, 200, 40);
  });

  bench('Circular layout - 50 cubes', () => {
    SvgCubeLayoutManager.calculateCircularPositions(medium, 400, 300, 200, 40);
  });

  bench('Circular layout - 100 cubes', () => {
    SvgCubeLayoutManager.calculateCircularPositions(large, 400, 300, 200, 40);
  });

  bench('Spiral layout - 10 cubes', () => {
    SvgCubeLayoutManager.calculateSpiralPositions(small, 400, 300, 50, 40);
  });

  bench('Spiral layout - 50 cubes', () => {
    SvgCubeLayoutManager.calculateSpiralPositions(medium, 400, 300, 50, 40);
  });

  bench('Spiral layout - 100 cubes', () => {
    SvgCubeLayoutManager.calculateSpiralPositions(large, 400, 300, 50, 40);
  });
});

describe('SVG Rendering Performance', () => {
  const small = generateTestColors(10);
  const medium = generateTestColors(50);
  const large = generateTestColors(100);
  const extraLarge = generateTestColors(200);

  const smallPositions = generateTestPositions(10);
  const mediumPositions = generateTestPositions(50);
  const largePositions = generateTestPositions(100);
  const extraLargePositions = generateTestPositions(200);

  bench('Basic SVG rendering - 10 cubes', () => {
    const svg = createSvgElement();
    const renderer = new SvgCubeRenderer(svg);
    renderer.renderCubes(small, smallPositions);
  });

  bench('Basic SVG rendering - 50 cubes', () => {
    const svg = createSvgElement();
    const renderer = new SvgCubeRenderer(svg);
    renderer.renderCubes(medium, mediumPositions);
  });

  bench('Basic SVG rendering - 100 cubes', () => {
    const svg = createSvgElement();
    const renderer = new SvgCubeRenderer(svg);
    renderer.renderCubes(large, largePositions);
  });

  bench('Basic SVG rendering - 200 cubes', () => {
    const svg = createSvgElement();
    const renderer = new SvgCubeRenderer(svg);
    renderer.renderCubes(extraLarge, extraLargePositions);
  });

  bench('Enhanced SVG rendering - 10 cubes', () => {
    const svg = createSvgElement();
    const renderer = new EnhancedSvgCubeRenderer(svg, { enabled: false });
    renderer.renderCubes(small, smallPositions);
  });

  bench('Enhanced SVG rendering - 50 cubes', () => {
    const svg = createSvgElement();
    const renderer = new EnhancedSvgCubeRenderer(svg, { enabled: false });
    renderer.renderCubes(medium, mediumPositions);
  });

  bench('Enhanced SVG rendering - 100 cubes', () => {
    const svg = createSvgElement();
    const renderer = new EnhancedSvgCubeRenderer(svg, { enabled: false });
    renderer.renderCubes(large, largePositions);
  });

  bench('Enhanced SVG rendering with gradients - 50 cubes', () => {
    const svg = createSvgElement();
    const renderer = new EnhancedSvgCubeRenderer(
      svg,
      { enabled: false },
      { gradients: true, shadows: true }
    );
    renderer.renderCubes(medium, mediumPositions);
  });

  bench('Enhanced SVG rendering with animations - 50 cubes', () => {
    const svg = createSvgElement();
    const renderer = new EnhancedSvgCubeRenderer(svg, {
      enabled: true,
      type: 'scale',
      duration: 300,
    });
    renderer.renderCubes(medium, mediumPositions);
  });
});

describe('Memory and DOM Operations', () => {
  const testColors = generateTestColors(100);
  const testPositions = generateTestPositions(100);

  bench('SVG element creation (100 groups x 3 paths)', () => {
    const svg = createSvgElement();

    for (let i = 0; i < 100; i++) {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      for (let j = 0; j < 3; j++) {
        const path = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path'
        );
        path.setAttribute('d', `M ${i} ${j} L ${i + 10} ${j + 10} Z`);
        path.setAttribute('fill', `rgb(${i}, ${j}, 128)`);
        group.appendChild(path);
      }

      svg.appendChild(group);
    }
  });

  bench('SVG element cleanup (100 groups)', () => {
    const svg = createSvgElement();
    const renderer = new SvgCubeRenderer(svg);

    // セットアップ
    renderer.renderCubes(testColors, testPositions);

    // クリーンアップ
    renderer.clearCubes();
  });

  bench('SVG export (100 cubes)', () => {
    const svg = createSvgElement();
    const renderer = new SvgCubeRenderer(svg);
    renderer.renderCubes(testColors, testPositions);

    // エクスポート
    renderer.exportSvg();
  });

  bench('Enhanced SVG export with optimization (100 cubes)', () => {
    const svg = createSvgElement();
    const renderer = new EnhancedSvgCubeRenderer(svg);
    renderer.renderCubes(testColors, testPositions);

    // 最適化エクスポート
    renderer.exportOptimizedSvg();
  });
});

describe('Scaling Performance Comparison', () => {
  const cubeCounts = [5, 10, 25, 50, 100];

  cubeCounts.forEach((count) => {
    const colors = generateTestColors(count);
    const positions = generateTestPositions(count);

    bench(`Basic SVG - ${count} cubes`, () => {
      const svg = createSvgElement();
      const renderer = new SvgCubeRenderer(svg);
      renderer.renderCubes(colors, positions);
    });

    bench(`Enhanced SVG - ${count} cubes`, () => {
      const svg = createSvgElement();
      const renderer = new EnhancedSvgCubeRenderer(svg, { enabled: false });
      renderer.renderCubes(colors, positions);
    });
  });
});

describe('Animation Performance', () => {
  const testColors = generateTestColors(50);
  const testPositions = generateTestPositions(50);

  const animationTypes: Array<
    'fade' | 'scale' | 'slide' | 'rotate' | 'elastic'
  > = ['fade', 'scale', 'slide', 'rotate', 'elastic'];

  animationTypes.forEach((type) => {
    bench(`Animation setup - ${type} (50 cubes)`, () => {
      const svg = createSvgElement();
      const renderer = new EnhancedSvgCubeRenderer(svg, {
        enabled: true,
        type,
        duration: 300,
        stagger: 20,
      });
      renderer.renderCubes(testColors, testPositions);
    });
  });

  bench('Animation disable/enable toggle', () => {
    const svg = createSvgElement();
    const renderer = new EnhancedSvgCubeRenderer(svg);

    // 設定を複数回変更
    renderer.updateAnimationConfig({ enabled: false });
    renderer.updateAnimationConfig({ enabled: true });
    renderer.updateAnimationConfig({ type: 'elastic' });
    renderer.updateAnimationConfig({ duration: 500 });
  });
});

describe('Real-world Usage Simulation', () => {
  bench('Complete workflow: layout → render → export', () => {
    const colors = generateTestColors(25);

    // 1. レイアウト計算
    const gridPositions = SvgCubeLayoutManager.calculateGridPositions(
      colors,
      800,
      600,
      40
    );

    // 2. レンダリング
    const svg = createSvgElement();
    const renderer = new SvgCubeRenderer(svg);
    renderer.renderCubes(colors, gridPositions);

    // 3. エクスポート
    renderer.exportSvg();
  });

  bench('Interactive workflow: render → update → re-render', () => {
    const colors = generateTestColors(20);
    const positions = generateTestPositions(20);

    const svg = createSvgElement();
    const renderer = new SvgCubeRenderer(svg);

    // 初期レンダリング
    renderer.renderCubes(colors, positions);

    // 更新（色変更をシミュレート）
    const updatedColors = colors.map((color) => ({
      ...color,
      brightness: Math.random(),
    }));

    // 再レンダリング
    renderer.renderCubes(updatedColors, positions);
  });

  bench('Enhanced workflow with all features', () => {
    const colors = generateTestColors(30);
    const positions = SvgCubeLayoutManager.calculateCircularPositions(
      colors,
      400,
      300,
      150,
      35
    );

    const svg = createSvgElement();
    const renderer = new EnhancedSvgCubeRenderer(
      svg,
      { enabled: true, type: 'scale', duration: 400 },
      { gradients: true, shadows: true, highDpi: true }
    );

    // レンダリング
    renderer.renderCubes(colors, positions);

    // アクセシビリティ強化
    renderer.enhanceAccessibility();

    // パフォーマンス測定
    renderer.measurePerformance();

    // エクスポート
    renderer.exportOptimizedSvg();
  });
});
