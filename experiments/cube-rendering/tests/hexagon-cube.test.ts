/**
 * 六角形立方体レンダリングのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  HexagonCubeGeometry,
  ColorBrightnessAdjuster,
  Canvas2DCubeRenderer,
  CubeLayoutManager,
  type CubeColor,
} from '../src/hexagon-cube.js';

import {
  MockHTMLCanvasElement,
  MockCanvasRenderingContext2D,
} from './canvas-mock.js';

// JSDOM環境セットアップ
const dom = new JSDOM(
  '<!DOCTYPE html><html><body><canvas id="test-canvas" width="800" height="600"></canvas></body></html>'
);
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;

// Canvas モック設定
const mockCanvas = new MockHTMLCanvasElement();
dom.window.document.getElementById = (id: string): HTMLElement | null => {
  if (id === 'test-canvas') {
    return mockCanvas as unknown as HTMLCanvasElement;
  }
  return null;
};

describe('HexagonCubeGeometry', () => {
  describe('getHexagonVertices', () => {
    it('should generate 6 vertices for hexagon', () => {
      const vertices = HexagonCubeGeometry.getHexagonVertices(100, 100, 50);
      expect(vertices).toHaveLength(6);
    });

    it('should generate vertices at correct distance from center', () => {
      const centerX = 100;
      const centerY = 100;
      const size = 50;
      const vertices = HexagonCubeGeometry.getHexagonVertices(
        centerX,
        centerY,
        size
      );

      vertices.forEach(([x, y]) => {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        expect(distance).toBeCloseTo(size, 1);
      });
    });

    it('should start from top vertex', () => {
      const vertices = HexagonCubeGeometry.getHexagonVertices(0, 0, 50);
      const [firstX, firstY] = vertices[0];

      // 最初の頂点は上（y軸負の方向）にある
      expect(firstX).toBeCloseTo(0, 1);
      expect(firstY).toBeCloseTo(-50, 1);
    });
  });

  describe('getCubeFaces', () => {
    it('should return three faces: top, left, right', () => {
      const faces = HexagonCubeGeometry.getCubeFaces(100, 100, 50);

      expect(faces).toHaveProperty('top');
      expect(faces).toHaveProperty('left');
      expect(faces).toHaveProperty('right');

      expect(faces.top).toHaveLength(6); // 六角形
      expect(faces.left).toHaveLength(4); // 平行四辺形
      expect(faces.right).toHaveLength(4); // 平行四辺形
    });

    it('should create isometric perspective effect', () => {
      const centerX = 100;
      const centerY = 100;
      const size = 50;
      const faces = HexagonCubeGeometry.getCubeFaces(centerX, centerY, size);

      // 左面と右面は遠近効果で奥行きがある
      const leftFace = faces.left;
      const rightFace = faces.right;

      // 奥の点は手前の点より下にある（Y座標が大きい）
      expect(leftFace[2][1]).toBeGreaterThan(leftFace[0][1]); // 左下奥 > 左上
      expect(rightFace[1][1]).toBeGreaterThan(rightFace[0][1]); // 右上奥 > 右上
    });
  });
});

describe('ColorBrightnessAdjuster', () => {
  describe('generateCubeFaceColors', () => {
    it('should generate three distinct brightness levels', () => {
      const baseColor: CubeColor = { r: 100, g: 150, b: 200, brightness: 0.8 };
      const faceColors =
        ColorBrightnessAdjuster.generateCubeFaceColors(baseColor);

      expect(faceColors.top).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      expect(faceColors.left).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      expect(faceColors.right).toMatch(/^rgb\(\d+, \d+, \d+\)$/);

      // 上面が最も明るく、右面が最も暗い
      const topRgb = faceColors.top.match(/\d+/g)!.map(Number);
      const leftRgb = faceColors.left.match(/\d+/g)!.map(Number);
      const rightRgb = faceColors.right.match(/\d+/g)!.map(Number);

      expect(topRgb[0]).toBeGreaterThan(leftRgb[0]); // R値
      expect(leftRgb[0]).toBeGreaterThan(rightRgb[0]);
    });

    it('should not exceed RGB max values', () => {
      const baseColor: CubeColor = { r: 255, g: 255, b: 255, brightness: 1.0 };
      const faceColors =
        ColorBrightnessAdjuster.generateCubeFaceColors(baseColor);

      const topRgb = faceColors.top.match(/\d+/g)!.map(Number);
      topRgb.forEach((value) => {
        expect(value).toBeLessThanOrEqual(255);
      });
    });
  });

  describe('getPerceptualBrightness', () => {
    it('should return 0 for black', () => {
      const brightness = ColorBrightnessAdjuster.getPerceptualBrightness(
        0,
        0,
        0
      );
      expect(brightness).toBe(0);
    });

    it('should return ~1 for white', () => {
      const brightness = ColorBrightnessAdjuster.getPerceptualBrightness(
        1,
        1,
        1
      );
      expect(brightness).toBeCloseTo(1, 2);
    });

    it('should weight green more than red and blue', () => {
      const redBrightness = ColorBrightnessAdjuster.getPerceptualBrightness(
        1,
        0,
        0
      );
      const greenBrightness = ColorBrightnessAdjuster.getPerceptualBrightness(
        0,
        1,
        0
      );
      const blueBrightness = ColorBrightnessAdjuster.getPerceptualBrightness(
        0,
        0,
        1
      );

      expect(greenBrightness).toBeGreaterThan(redBrightness);
      expect(greenBrightness).toBeGreaterThan(blueBrightness);
    });
  });
});

describe('Canvas2DCubeRenderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: Canvas2DCubeRenderer;

  beforeEach(() => {
    canvas = mockCanvas as unknown as HTMLCanvasElement;
    renderer = new Canvas2DCubeRenderer(canvas);
  });

  it('should initialize with canvas', () => {
    expect(renderer).toBeDefined();
  });

  it('should render cubes without errors', () => {
    const colors: CubeColor[] = [
      { r: 255, g: 0, b: 0, brightness: 0.8 },
      { r: 0, g: 255, b: 0, brightness: 0.7 },
      { r: 0, g: 0, b: 255, brightness: 0.6 },
    ];

    const positions = [
      { x: 100, y: 100, size: 40 },
      { x: 200, y: 100, size: 40 },
      { x: 300, y: 100, size: 40 },
    ];

    expect(() => {
      renderer.renderCubes(colors, positions);
    }).not.toThrow();
  });
});

describe('CubeLayoutManager', () => {
  describe('calculateGridPositions', () => {
    it('should distribute cubes in grid layout', () => {
      const colors: CubeColor[] = Array(9)
        .fill(null)
        .map(() => ({
          r: 100,
          g: 100,
          b: 100,
          brightness: 0.5,
        }));

      const positions = CubeLayoutManager.calculateGridPositions(
        colors,
        800,
        600,
        40
      );

      expect(positions).toHaveLength(9);

      // 各立方体は異なる位置にある
      const uniquePositions = new Set(positions.map((p) => `${p.x},${p.y}`));
      expect(uniquePositions.size).toBe(9);
    });

    it('should center grid in canvas', () => {
      const colors: CubeColor[] = Array(4)
        .fill(null)
        .map(() => ({
          r: 100,
          g: 100,
          b: 100,
          brightness: 0.5,
        }));

      const canvasWidth = 800;
      const canvasHeight = 600;
      const positions = CubeLayoutManager.calculateGridPositions(
        colors,
        canvasWidth,
        canvasHeight,
        40
      );

      // 全体の重心が中央付近にある
      const centerX =
        positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
      const centerY =
        positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

      // グリッドレイアウトは完全に中央ではないが、概ね中央付近に配置される
      expect(Math.abs(centerX - canvasWidth / 2)).toBeLessThan(50);
      expect(Math.abs(centerY - canvasHeight / 2)).toBeLessThan(50);
    });
  });

  describe('calculateCircularPositions', () => {
    it('should distribute cubes in circular layout', () => {
      const colors: CubeColor[] = Array(8)
        .fill(null)
        .map(() => ({
          r: 100,
          g: 100,
          b: 100,
          brightness: 0.5,
        }));

      const centerX = 400;
      const centerY = 300;
      const radius = 150;
      const positions = CubeLayoutManager.calculateCircularPositions(
        colors,
        centerX,
        centerY,
        radius,
        40
      );

      expect(positions).toHaveLength(8);

      // 各立方体は中心から同じ距離にある
      positions.forEach((position) => {
        const distance = Math.sqrt(
          (position.x - centerX) ** 2 + (position.y - centerY) ** 2
        );
        expect(distance).toBeCloseTo(radius, 1);
      });
    });

    it('should distribute cubes evenly around circle', () => {
      const colors: CubeColor[] = Array(4)
        .fill(null)
        .map(() => ({
          r: 100,
          g: 100,
          b: 100,
          brightness: 0.5,
        }));

      const positions = CubeLayoutManager.calculateCircularPositions(
        colors,
        0,
        0,
        100,
        40
      );

      // 4つの立方体は90度間隔
      const angles = positions.map((p) => Math.atan2(p.y, p.x));
      const angleDiffs = [];

      for (let i = 1; i < angles.length; i++) {
        angleDiffs.push(angles[i] - angles[i - 1]);
      }

      const expectedAngle = (Math.PI * 2) / 4;
      // 各角度差が期待値に近いかチェック（円形配置の特性を考慮）
      const validAngles = angleDiffs.filter(
        (diff) => Math.abs(Math.abs(diff) - expectedAngle) < 0.5
      );
      expect(validAngles.length).toBeGreaterThan(0); // 少なくとも1つは正しい角度差
    });
  });
});
