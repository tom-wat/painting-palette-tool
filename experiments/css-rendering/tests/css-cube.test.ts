/**
 * CSS Transform擬似立方体レンダリングのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CssCubeGeometry,
  CssCubeColorAdjuster,
  CssCubeLayoutManager,
  CssCubeRenderer,
  type CubeColor,
  type CubePosition,
} from '../src/css-cube.js';

describe('CssCubeGeometry', () => {
  describe('calculateFaceVertices', () => {
    it('正しい頂点座標を計算する', () => {
      const vertices = CssCubeGeometry.calculateFaceVertices(100, 100, 60);

      // 上面は6つの頂点
      expect(vertices.top).toHaveLength(6);
      // 左面と右面は4つの頂点
      expect(vertices.left).toHaveLength(4);
      expect(vertices.right).toHaveLength(4);

      // 座標が数値であることを確認
      vertices.top.forEach((vertex) => {
        expect(typeof vertex.x).toBe('number');
        expect(typeof vertex.y).toBe('number');
      });
    });

    it('サイズ変更が頂点座標に反映される', () => {
      const small = CssCubeGeometry.calculateFaceVertices(0, 0, 20);
      const large = CssCubeGeometry.calculateFaceVertices(0, 0, 80);

      // 大きいサイズの方が座標の範囲が広い
      const smallRange = Math.max(...small.top.map((v) => Math.abs(v.x)));
      const largeRange = Math.max(...large.top.map((v) => Math.abs(v.x)));

      expect(largeRange).toBeGreaterThan(smallRange);
    });
  });

  describe('calculateTransforms', () => {
    it('CSS Transform値を生成する', () => {
      const transforms = CssCubeGeometry.calculateTransforms(50, 50, 40);

      expect(transforms.top).toContain('translate3d');
      expect(transforms.left).toContain('translate3d');
      expect(transforms.right).toContain('translate3d');

      expect(transforms.top).toContain('rotate');
      expect(transforms.left).toContain('rotate');
      expect(transforms.right).toContain('rotate');
    });
  });
});

describe('CssCubeColorAdjuster', () => {
  describe('getPerceptualBrightness', () => {
    it('WCAG基準の知覚輝度を計算する', () => {
      // 白色（最大輝度）
      const whiteBrightness = CssCubeColorAdjuster.getPerceptualBrightness(
        255,
        255,
        255
      );
      expect(whiteBrightness).toBeCloseTo(1, 2);

      // 黒色（最小輝度）
      const blackBrightness = CssCubeColorAdjuster.getPerceptualBrightness(
        0,
        0,
        0
      );
      expect(blackBrightness).toBeCloseTo(0, 2);

      // 中間色
      const grayBrightness = CssCubeColorAdjuster.getPerceptualBrightness(
        128,
        128,
        128
      );
      expect(grayBrightness).toBeGreaterThan(blackBrightness);
      expect(grayBrightness).toBeLessThan(whiteBrightness);
    });

    it('緑色が最も輝度寄与が高い', () => {
      const red = CssCubeColorAdjuster.getPerceptualBrightness(255, 0, 0);
      const green = CssCubeColorAdjuster.getPerceptualBrightness(0, 255, 0);
      const blue = CssCubeColorAdjuster.getPerceptualBrightness(0, 0, 255);

      expect(green).toBeGreaterThan(red);
      expect(green).toBeGreaterThan(blue);
    });
  });

  describe('generateCubeFaceColors', () => {
    it('3つの面の色を生成する', () => {
      const baseColor: CubeColor = { r: 128, g: 100, b: 80, brightness: 0.5 };
      const faceColors = CssCubeColorAdjuster.generateCubeFaceColors(baseColor);

      expect(faceColors.top).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
      expect(faceColors.left).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
      expect(faceColors.right).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });

    it('上面が最も明るく、右面が最も暗い', () => {
      const baseColor: CubeColor = { r: 100, g: 100, b: 100, brightness: 0.5 };
      const faceColors = CssCubeColorAdjuster.generateCubeFaceColors(baseColor);

      // RGB値を抽出
      const extractRgbValues = (rgbString: string) => {
        const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        return match
          ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
          : [0, 0, 0];
      };

      const topRgb = extractRgbValues(faceColors.top);
      const leftRgb = extractRgbValues(faceColors.left);
      const rightRgb = extractRgbValues(faceColors.right);

      const topBrightness = topRgb[0] + topRgb[1] + topRgb[2];
      const leftBrightness = leftRgb[0] + leftRgb[1] + leftRgb[2];
      const rightBrightness = rightRgb[0] + rightRgb[1] + rightRgb[2];

      expect(topBrightness).toBeGreaterThan(leftBrightness);
      expect(leftBrightness).toBeGreaterThan(rightBrightness);
    });
  });
});

describe('CssCubeLayoutManager', () => {
  const sampleColors: CubeColor[] = [
    { r: 255, g: 0, b: 0, brightness: 0.5 },
    { r: 0, g: 255, b: 0, brightness: 0.6 },
    { r: 0, g: 0, b: 255, brightness: 0.4 },
    { r: 255, g: 255, b: 0, brightness: 0.7 },
  ];

  describe('calculateGridPositions', () => {
    it('グリッド配置の位置を計算する', () => {
      const positions = CssCubeLayoutManager.calculateGridPositions(
        sampleColors,
        800,
        600,
        50
      );

      expect(positions).toHaveLength(sampleColors.length);

      positions.forEach((pos) => {
        expect(pos.x).toBeGreaterThan(0);
        expect(pos.y).toBeGreaterThan(0);
        expect(pos.size).toBe(50);
      });
    });

    it('コンテナサイズに応じて配置が調整される', () => {
      const small = CssCubeLayoutManager.calculateGridPositions(
        sampleColors,
        400,
        300,
        40
      );
      const large = CssCubeLayoutManager.calculateGridPositions(
        sampleColors,
        1200,
        800,
        40
      );

      // 配置が計算される
      expect(small.length).toBe(sampleColors.length);
      expect(large.length).toBe(sampleColors.length);
    });
  });

  describe('calculateCircularPositions', () => {
    it('円形配置の位置を計算する', () => {
      const positions = CssCubeLayoutManager.calculateCircularPositions(
        sampleColors,
        400,
        300,
        150,
        40
      );

      expect(positions).toHaveLength(sampleColors.length);

      // 全ての点が中心から一定距離にある
      positions.forEach((pos) => {
        const distance = Math.sqrt((pos.x - 400) ** 2 + (pos.y - 300) ** 2);
        expect(distance).toBeCloseTo(150, 1);
      });
    });
  });

  describe('calculateSpiralPositions', () => {
    it('スパイラル配置の位置を計算する', () => {
      const positions = CssCubeLayoutManager.calculateSpiralPositions(
        sampleColors,
        400,
        300,
        30,
        35
      );

      expect(positions).toHaveLength(sampleColors.length);

      // 最初の点が中心に近い
      const firstDistance = Math.sqrt(
        (positions[0].x - 400) ** 2 + (positions[0].y - 300) ** 2
      );
      const lastDistance = Math.sqrt(
        (positions[positions.length - 1].x - 400) ** 2 +
          (positions[positions.length - 1].y - 300) ** 2
      );

      expect(lastDistance).toBeGreaterThan(firstDistance);
    });
  });
});

describe('CssCubeRenderer', () => {
  let container: HTMLElement;
  let renderer: CssCubeRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    renderer = new CssCubeRenderer(container);
  });

  describe('initialization', () => {
    it('コンテナが正しく初期化される', () => {
      expect(container.style.position).toBe('relative');
      expect(container.style.transformStyle).toBe('preserve-3d');
      expect(container.style.perspective).toBe('1000px');
    });

    it('ハードウェアアクセラレーションが有効になる', () => {
      const accelRenderer = new CssCubeRenderer(container, {
        enableHardwareAcceleration: true,
      });

      expect(container.style.transform).toContain('translateZ');
      expect(container.style.backfaceVisibility).toBe('hidden');
    });
  });

  describe('renderCubes', () => {
    const testColors: CubeColor[] = [
      { r: 255, g: 100, b: 50, brightness: 0.6 },
      { r: 100, g: 255, b: 50, brightness: 0.7 },
      { r: 50, g: 100, b: 255, brightness: 0.5 },
    ];

    const testPositions: CubePosition[] = [
      { x: 100, y: 100, size: 50 },
      { x: 200, y: 150, size: 50 },
      { x: 300, y: 120, size: 50 },
    ];

    it('複数の立方体をレンダリングする', () => {
      renderer.renderCubes(testColors, testPositions);

      const cubeGroups = container.querySelectorAll('.css-cube-group');
      expect(cubeGroups).toHaveLength(testColors.length);

      // 各立方体に3つの面がある
      cubeGroups.forEach((group) => {
        const faces = group.querySelectorAll('.css-cube-face');
        expect(faces).toHaveLength(3);
      });
    });

    it('立方体の位置が正しく設定される', () => {
      renderer.renderCubes(testColors, testPositions);

      const cubeGroups = container.querySelectorAll('.css-cube-group');
      cubeGroups.forEach((group, index) => {
        const element = group as HTMLElement;
        const expectedPos = testPositions[index];

        expect(element.style.transform).toContain(
          `translate3d(${expectedPos.x - expectedPos.size / 2}px, ${expectedPos.y - expectedPos.size / 2}px, 0)`
        );
      });
    });

    it('面の色が正しく設定される', () => {
      renderer.renderCubes(testColors, testPositions);

      const cubeGroups = container.querySelectorAll('.css-cube-group');
      cubeGroups.forEach((group) => {
        const faces = group.querySelectorAll('.css-cube-face');

        faces.forEach((face) => {
          const element = face as HTMLElement;
          expect(element.style.backgroundColor).toMatch(/^rgb\(/);
        });
      });
    });
  });

  describe('interactions', () => {
    it('ホバー効果が機能する', () => {
      const testColors: CubeColor[] = [
        { r: 128, g: 128, b: 128, brightness: 0.5 },
      ];
      const testPositions: CubePosition[] = [{ x: 100, y: 100, size: 50 }];

      renderer.renderCubes(testColors, testPositions);

      const cubeGroup = container.querySelector(
        '.css-cube-group'
      ) as HTMLElement;
      expect(cubeGroup).toBeTruthy();

      // mouseenter イベントをシミュレート
      cubeGroup.dispatchEvent(new Event('mouseenter'));

      // transform が変更される（スケールが追加される）
      expect(cubeGroup.style.transform).toContain('scale3d');
    });

    it('クリックイベントが色情報を表示する', () => {
      const testColors: CubeColor[] = [
        { r: 200, g: 150, b: 100, brightness: 0.6 },
      ];
      const testPositions: CubePosition[] = [{ x: 150, y: 120, size: 60 }];

      let eventFired = false;
      container.addEventListener('cubeColorSelected', () => {
        eventFired = true;
      });

      renderer.renderCubes(testColors, testPositions);

      const cubeGroup = container.querySelector(
        '.css-cube-group'
      ) as HTMLElement;
      cubeGroup.dispatchEvent(new Event('click'));

      expect(eventFired).toBe(true);
    });
  });

  describe('performance', () => {
    it('パフォーマンス測定が機能する', () => {
      const testColors: CubeColor[] = Array.from({ length: 10 }, (_, i) => ({
        r: i * 25,
        g: i * 20,
        b: i * 30,
        brightness: i / 10,
      }));

      const testPositions: CubePosition[] = Array.from(
        { length: 10 },
        (_, i) => ({
          x: i * 80,
          y: 100,
          size: 40,
        })
      );

      renderer.renderCubes(testColors, testPositions);

      const performance = renderer.measurePerformance();
      expect(performance.renderTime).toBeGreaterThanOrEqual(0);
      expect(performance.elementCount).toBe(testColors.length);
    });
  });

  describe('cleanup', () => {
    it('立方体をクリアできる', () => {
      const testColors: CubeColor[] = [
        { r: 255, g: 0, b: 0, brightness: 0.5 },
        { r: 0, g: 255, b: 0, brightness: 0.6 },
      ];
      const testPositions: CubePosition[] = [
        { x: 100, y: 100, size: 50 },
        { x: 200, y: 100, size: 50 },
      ];

      renderer.renderCubes(testColors, testPositions);
      expect(container.querySelectorAll('.css-cube-group')).toHaveLength(2);

      renderer.clearCubes();
      expect(container.querySelectorAll('.css-cube-group')).toHaveLength(0);
    });

    it('アニメーション付きクリアが機能する', async () => {
      const testColors: CubeColor[] = [
        { r: 128, g: 128, b: 128, brightness: 0.5 },
      ];
      const testPositions: CubePosition[] = [{ x: 100, y: 100, size: 50 }];

      renderer.renderCubes(testColors, testPositions);
      expect(container.querySelectorAll('.css-cube-group')).toHaveLength(1);

      const clearPromise = renderer.clearWithAnimation(100);
      await clearPromise;

      expect(container.querySelectorAll('.css-cube-group')).toHaveLength(0);
    });
  });

  describe('configuration', () => {
    it('設定を更新できる', () => {
      renderer.updateConfig({ enableHardwareAcceleration: false });

      // 設定変更後のコンテナスタイルを確認
      // この場合、新しい設定でコンテナが再セットアップされる
      expect(container.style.transformStyle).toBe('preserve-3d');
    });
  });
});
