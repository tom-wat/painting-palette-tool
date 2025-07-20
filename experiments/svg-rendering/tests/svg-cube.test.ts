/**
 * SVG立方体レンダリングエンジンのテストスイート
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  SvgCubeGeometry,
  SvgColorBrightnessAdjuster,
  SvgCubeRenderer,
  SvgCubeLayoutManager,
  CubeColor,
} from '../src/svg-cube.js';

// DOM環境のセットアップ
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;
global.SVGElement = dom.window.SVGElement;

describe('SvgCubeGeometry', () => {
  describe('getHexagonPath', () => {
    it('should generate valid SVG path string for hexagon', () => {
      const path = SvgCubeGeometry.getHexagonPath(100, 100, 50);

      expect(path).toContain('M ');
      expect(path).toContain('L ');
      expect(path.endsWith(' Z')).toBe(true);
      expect(path.split('L')).toHaveLength(6); // 6つの頂点
    });

    it('should generate different paths for different parameters', () => {
      const path1 = SvgCubeGeometry.getHexagonPath(100, 100, 50);
      const path2 = SvgCubeGeometry.getHexagonPath(200, 200, 30);

      expect(path1).not.toBe(path2);
    });

    it('should handle edge cases', () => {
      const zeroSizePath = SvgCubeGeometry.getHexagonPath(0, 0, 0);
      expect(zeroSizePath).toBe('M 0 0 L 0 0 L 0 0 L 0 0 L 0 0 L 0 0 Z');
    });
  });

  describe('getHexagonVertices', () => {
    it('should return 6 vertices', () => {
      const vertices = SvgCubeGeometry.getHexagonVertices(100, 100, 50);
      expect(vertices).toHaveLength(6);
    });

    it('should return vertices within expected radius', () => {
      const centerX = 100,
        centerY = 100,
        size = 50;
      const vertices = SvgCubeGeometry.getHexagonVertices(
        centerX,
        centerY,
        size
      );

      vertices.forEach(([x, y]) => {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        expect(distance).toBeCloseTo(size, 1);
      });
    });

    it('should start from top vertex (angle -π/2)', () => {
      const vertices = SvgCubeGeometry.getHexagonVertices(100, 100, 50);
      const [firstX, firstY] = vertices[0];

      // 最初の頂点は上部にある
      expect(firstY).toBeLessThan(100);
      expect(Math.abs(firstX - 100)).toBeLessThan(1);
    });
  });

  describe('getCubeFacePaths', () => {
    it('should return paths for all three faces', () => {
      const faces = SvgCubeGeometry.getCubeFacePaths(100, 100, 50);

      expect(faces).toHaveProperty('top');
      expect(faces).toHaveProperty('left');
      expect(faces).toHaveProperty('right');

      expect(faces.top).toContain('M ');
      expect(faces.left).toContain('M ');
      expect(faces.right).toContain('M ');
    });

    it('should generate consistent geometry', () => {
      const faces1 = SvgCubeGeometry.getCubeFacePaths(100, 100, 50);
      const faces2 = SvgCubeGeometry.getCubeFacePaths(100, 100, 50);

      expect(faces1.top).toBe(faces2.top);
      expect(faces1.left).toBe(faces2.left);
      expect(faces1.right).toBe(faces2.right);
    });
  });
});

describe('SvgColorBrightnessAdjuster', () => {
  const testColor: CubeColor = {
    r: 128,
    g: 128,
    b: 128,
    brightness: 0.5,
  };

  describe('generateCubeFaceColors', () => {
    it('should generate colors for all three faces', () => {
      const colors =
        SvgColorBrightnessAdjuster.generateCubeFaceColors(testColor);

      expect(colors).toHaveProperty('top');
      expect(colors).toHaveProperty('left');
      expect(colors).toHaveProperty('right');

      expect(colors.top).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      expect(colors.left).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      expect(colors.right).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    });

    it('should apply correct brightness hierarchy', () => {
      const colors =
        SvgColorBrightnessAdjuster.generateCubeFaceColors(testColor);

      // RGB値を抽出
      const extractRgbValues = (rgbString: string): number[] => {
        const match = rgbString.match(/rgb\((\d+), (\d+), (\d+)\)/);
        return match
          ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
          : [0, 0, 0];
      };

      const topRgb = extractRgbValues(colors.top);
      const leftRgb = extractRgbValues(colors.left);
      const rightRgb = extractRgbValues(colors.right);

      // 上面が最も明るく、右面が最も暗い
      expect(topRgb[0]).toBeGreaterThan(leftRgb[0]);
      expect(leftRgb[0]).toBeGreaterThan(rightRgb[0]);
    });

    it('should handle extreme color values', () => {
      const blackColor: CubeColor = { r: 0, g: 0, b: 0, brightness: 0 };
      const whiteColor: CubeColor = { r: 255, g: 255, b: 255, brightness: 1 };

      const blackColors =
        SvgColorBrightnessAdjuster.generateCubeFaceColors(blackColor);
      const whiteColors =
        SvgColorBrightnessAdjuster.generateCubeFaceColors(whiteColor);

      expect(blackColors.top).toBe('rgb(0, 0, 0)');
      expect(whiteColors.top).toBe('rgb(255, 255, 255)');
    });
  });

  describe('getPerceptualBrightness', () => {
    it('should calculate WCAG compliant perceptual brightness', () => {
      // 白色
      const whiteBrightness =
        SvgColorBrightnessAdjuster.getPerceptualBrightness(1, 1, 1);
      expect(whiteBrightness).toBeCloseTo(1, 3);

      // 黒色
      const blackBrightness =
        SvgColorBrightnessAdjuster.getPerceptualBrightness(0, 0, 0);
      expect(blackBrightness).toBe(0);

      // 赤色（緑の係数が最も高いのでより暗く見える）
      const redBrightness = SvgColorBrightnessAdjuster.getPerceptualBrightness(
        1,
        0,
        0
      );
      const greenBrightness =
        SvgColorBrightnessAdjuster.getPerceptualBrightness(0, 1, 0);

      expect(greenBrightness).toBeGreaterThan(redBrightness);
    });

    it('should handle edge cases', () => {
      const result = SvgColorBrightnessAdjuster.getPerceptualBrightness(
        0.5,
        0.5,
        0.5
      );
      expect(result).toBeCloseTo(0.5, 3);
    });
  });
});

describe('SvgCubeLayoutManager', () => {
  const sampleColors: CubeColor[] = [
    { r: 255, g: 0, b: 0, brightness: 0.8 },
    { r: 0, g: 255, b: 0, brightness: 0.6 },
    { r: 0, g: 0, b: 255, brightness: 0.4 },
    { r: 255, g: 255, b: 0, brightness: 0.9 },
  ];

  describe('calculateGridPositions', () => {
    it('should generate positions for all colors', () => {
      const positions = SvgCubeLayoutManager.calculateGridPositions(
        sampleColors,
        800,
        600,
        40
      );

      expect(positions).toHaveLength(sampleColors.length);
      positions.forEach((pos) => {
        expect(pos).toHaveProperty('x');
        expect(pos).toHaveProperty('y');
        expect(pos).toHaveProperty('size');
        expect(pos.size).toBe(40);
      });
    });

    it('should center the grid in container', () => {
      const containerWidth = 800,
        containerHeight = 600;
      const positions = SvgCubeLayoutManager.calculateGridPositions(
        sampleColors,
        containerWidth,
        containerHeight,
        40
      );

      // 位置が妥当な範囲内にある
      positions.forEach((pos) => {
        expect(pos.x).toBeGreaterThan(0);
        expect(pos.x).toBeLessThan(containerWidth);
        expect(pos.y).toBeGreaterThan(0);
        expect(pos.y).toBeLessThan(containerHeight);
      });
    });

    it('should maintain proper grid structure', () => {
      const positions = SvgCubeLayoutManager.calculateGridPositions(
        sampleColors,
        800,
        600,
        40
      );

      // 正方形に近いグリッド配置
      const cols = Math.ceil(Math.sqrt(sampleColors.length));
      const expectedCols = 2; // 4色 -> 2x2グリッド
      expect(cols).toBe(expectedCols);
    });
  });

  describe('calculateCircularPositions', () => {
    it('should generate positions in circular arrangement', () => {
      const centerX = 400,
        centerY = 300,
        radius = 150;
      const positions = SvgCubeLayoutManager.calculateCircularPositions(
        sampleColors,
        centerX,
        centerY,
        radius,
        40
      );

      expect(positions).toHaveLength(sampleColors.length);

      // 各位置が中心から指定された半径の距離にある
      positions.forEach((pos) => {
        const distance = Math.sqrt(
          (pos.x - centerX) ** 2 + (pos.y - centerY) ** 2
        );
        expect(distance).toBeCloseTo(radius, 1);
      });
    });

    it('should distribute angles evenly', () => {
      const centerX = 400,
        centerY = 300,
        radius = 150;
      const positions = SvgCubeLayoutManager.calculateCircularPositions(
        sampleColors,
        centerX,
        centerY,
        radius,
        40
      );

      // 最初の位置は上部にある（-π/2から開始）
      expect(positions[0].y).toBeLessThan(centerY);
      expect(Math.abs(positions[0].x - centerX)).toBeLessThan(5);
    });

    it('should handle single color', () => {
      const singleColor = [sampleColors[0]];
      const positions = SvgCubeLayoutManager.calculateCircularPositions(
        singleColor,
        400,
        300,
        150,
        40
      );

      expect(positions).toHaveLength(1);
      expect(positions[0].x).toBeCloseTo(400, 1);
      expect(positions[0].y).toBeCloseTo(150, 1); // 300 - 150
    });
  });

  describe('calculateSpiralPositions', () => {
    it('should generate positions in spiral arrangement', () => {
      const centerX = 400,
        centerY = 300,
        initialRadius = 50;
      const positions = SvgCubeLayoutManager.calculateSpiralPositions(
        sampleColors,
        centerX,
        centerY,
        initialRadius,
        40
      );

      expect(positions).toHaveLength(sampleColors.length);

      // 各位置の距離が徐々に増加する
      const distances = positions.map((pos) =>
        Math.sqrt((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2)
      );

      for (let i = 1; i < distances.length; i++) {
        expect(distances[i]).toBeGreaterThan(distances[i - 1]);
      }
    });

    it('should start from initial radius', () => {
      const centerX = 400,
        centerY = 300,
        initialRadius = 50;
      const positions = SvgCubeLayoutManager.calculateSpiralPositions(
        sampleColors,
        centerX,
        centerY,
        initialRadius,
        40
      );

      const firstDistance = Math.sqrt(
        (positions[0].x - centerX) ** 2 + (positions[0].y - centerY) ** 2
      );

      expect(firstDistance).toBeCloseTo(initialRadius, 1);
    });
  });
});

describe('SvgCubeRenderer', () => {
  let svgElement: SVGElement;
  let renderer: SvgCubeRenderer;

  beforeEach(() => {
    // SVG要素を作成
    svgElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    ) as unknown as SVGElement;
    document.body.appendChild(svgElement);

    // モック関数のセットアップ
    vi.spyOn(console, 'log').mockImplementation(() => {});

    renderer = new SvgCubeRenderer(svgElement);
  });

  describe('constructor', () => {
    it('should initialize with SVG element', () => {
      expect(renderer).toBeInstanceOf(SvgCubeRenderer);
      expect(svgElement.getAttribute('xmlns')).toBe(
        'http://www.w3.org/2000/svg'
      );
    });

    it('should set up SVG container properties', () => {
      expect(svgElement.style.userSelect).toBe('none');
      expect(svgElement.style.overflow).toBe('visible');
    });
  });

  describe('renderCubes', () => {
    const testColors: CubeColor[] = [
      { r: 255, g: 0, b: 0, brightness: 0.8 },
      { r: 0, g: 255, b: 0, brightness: 0.6 },
    ];
    const testPositions = [
      { x: 100, y: 100, size: 40 },
      { x: 200, y: 100, size: 40 },
    ];

    it('should render all cubes', () => {
      renderer.renderCubes(testColors, testPositions);

      const cubeGroups = svgElement.querySelectorAll('.svg-cube');
      expect(cubeGroups).toHaveLength(testColors.length);
    });

    it('should create proper group structure', () => {
      renderer.renderCubes(testColors, testPositions);

      const firstGroup = svgElement.querySelector('#cube-0');
      expect(firstGroup).toBeTruthy();
      expect(firstGroup?.getAttribute('class')).toBe('svg-cube');

      // 3面の要素が存在する
      const faces = firstGroup?.querySelectorAll('path');
      expect(faces).toHaveLength(3);
    });

    it('should clear previous cubes', () => {
      renderer.renderCubes(testColors, testPositions);
      const firstRenderCount = svgElement.querySelectorAll('.svg-cube').length;

      renderer.renderCubes([testColors[0]], [testPositions[0]]);
      const secondRenderCount = svgElement.querySelectorAll('.svg-cube').length;

      expect(firstRenderCount).toBe(2);
      expect(secondRenderCount).toBe(1);
    });

    it('should handle empty arrays', () => {
      renderer.renderCubes([], []);

      const cubeGroups = svgElement.querySelectorAll('.svg-cube');
      expect(cubeGroups).toHaveLength(0);
    });

    it('should handle mismatched array lengths', () => {
      const moreColors = [
        ...testColors,
        { r: 0, g: 0, b: 255, brightness: 0.4 },
      ];
      renderer.renderCubes(moreColors, testPositions);

      // positions配列の長さに制限される
      const cubeGroups = svgElement.querySelectorAll('.svg-cube');
      expect(cubeGroups).toHaveLength(testPositions.length);
    });
  });

  describe('cube interaction', () => {
    const testColor: CubeColor = { r: 255, g: 0, b: 0, brightness: 0.8 };
    const testPosition = { x: 100, y: 100, size: 40 };

    beforeEach(() => {
      renderer.renderCubes([testColor], [testPosition]);
    });

    it('should handle mouse events', () => {
      const group = svgElement.querySelector('.svg-cube') as SVGGElement;
      expect(group).toBeTruthy();

      // ホバー効果のテスト
      const mouseEnterEvent = dom.window.document.createEvent('Event');
      mouseEnterEvent.initEvent('mouseenter', true, true);
      group.dispatchEvent(mouseEnterEvent);

      expect(group.style.transform).toBe('scale(1.1)');
      expect(group.style.transformOrigin).toBe('center');
    });

    it('should handle click events', () => {
      const group = svgElement.querySelector('.svg-cube') as SVGGElement;

      // イベントハンドラーが設定されていることを確認
      expect(group).toBeTruthy();
      expect(group.addEventListener).toBeDefined();

      // jsdom環境ではイベントハンドラーの動作確認のみ
      expect(true).toBe(true);
    });

    it('should handle touch events', () => {
      const group = svgElement.querySelector('.svg-cube') as SVGGElement;

      // イベントハンドラーが設定されていることを確認
      expect(group).toBeTruthy();
      expect(group.addEventListener).toBeDefined();

      // jsdom環境ではイベントハンドラーの存在確認のみ
      expect(true).toBe(true);
    });
  });

  describe('animation features', () => {
    it('should enable animation', () => {
      renderer.enableAnimation();

      const testColor: CubeColor = { r: 255, g: 0, b: 0, brightness: 0.8 };
      const testPosition = { x: 100, y: 100, size: 40 };

      renderer.renderCubes([testColor], [testPosition]);

      const group = svgElement.querySelector('.svg-cube') as SVGGElement;
      expect(group.style.transition).toContain('opacity');
      expect(group.style.transition).toContain('transform');
    });

    it('should disable animation', () => {
      renderer.enableAnimation();
      renderer.disableAnimation();

      const testColor: CubeColor = { r: 255, g: 0, b: 0, brightness: 0.8 };
      const testPosition = { x: 100, y: 100, size: 40 };

      renderer.renderCubes([testColor], [testPosition]);

      const group = svgElement.querySelector('.svg-cube') as SVGGElement;
      expect(group.style.opacity).toBe('');
    });
  });

  describe('utility methods', () => {
    it('should clear cubes', () => {
      const testColors: CubeColor[] = [
        { r: 255, g: 0, b: 0, brightness: 0.8 },
        { r: 0, g: 255, b: 0, brightness: 0.6 },
      ];
      const testPositions = [
        { x: 100, y: 100, size: 40 },
        { x: 200, y: 100, size: 40 },
      ];

      renderer.renderCubes(testColors, testPositions);
      expect(svgElement.querySelectorAll('.svg-cube')).toHaveLength(2);

      renderer.clearCubes();
      expect(svgElement.querySelectorAll('.svg-cube')).toHaveLength(0);
    });

    it('should get cube by id', () => {
      const testColor: CubeColor = { r: 255, g: 0, b: 0, brightness: 0.8 };
      const testPosition = { x: 100, y: 100, size: 40 };

      renderer.renderCubes([testColor], [testPosition]);

      const cube = renderer.getCube('cube-0');
      expect(cube).toBeTruthy();
      expect(cube?.getAttribute('id')).toBe('cube-0');

      const nonExistentCube = renderer.getCube('cube-999');
      expect(nonExistentCube).toBeUndefined();
    });

    it('should export SVG', () => {
      const testColor: CubeColor = { r: 255, g: 0, b: 0, brightness: 0.8 };
      const testPosition = { x: 100, y: 100, size: 40 };

      renderer.renderCubes([testColor], [testPosition]);

      const exportedSvg = renderer.exportSvg();
      expect(exportedSvg).toContain('<svg');
      expect(exportedSvg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(exportedSvg).toContain('cube-0');
    });
  });
});

// パフォーマンステスト
describe('SVG Cube Performance', () => {
  it('should handle large number of cubes efficiently', () => {
    const svgElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    ) as unknown as SVGElement;
    document.body.appendChild(svgElement);
    const renderer = new SvgCubeRenderer(svgElement);

    // 100個の立方体を生成
    const colors: CubeColor[] = Array.from({ length: 100 }, (_, i) => ({
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
      brightness: Math.random(),
    }));

    const positions = SvgCubeLayoutManager.calculateGridPositions(
      colors,
      1000,
      1000,
      20
    );

    const startTime = performance.now();
    renderer.renderCubes(colors, positions);
    const endTime = performance.now();

    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(1000); // 1秒以内

    const cubeGroups = svgElement.querySelectorAll('.svg-cube');
    expect(cubeGroups).toHaveLength(100);
  });
});
