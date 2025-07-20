/**
 * CSS Transform擬似立方体レンダリングエンジン
 * ハードウェアアクセラレーション対応、軽量実装
 */

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

export interface CssCubeConfig {
  enableHardwareAcceleration: boolean;
  useWillChange: boolean;
  enable3dTransforms: boolean;
  optimizeForMobile: boolean;
}

/**
 * CSS立方体ジオメトリ計算
 */
export class CssCubeGeometry {
  /**
   * アイソメトリック投影の角度定数
   */
  static readonly ISOMETRIC_ANGLE = 30; // degrees
  static readonly DEPTH_RATIO = 0.5; // Z軸の深度比率

  /**
   * 立方体の3つの面の頂点座標を計算
   */
  static calculateFaceVertices(
    x: number,
    y: number,
    size: number
  ): {
    top: { x: number; y: number }[];
    left: { x: number; y: number }[];
    right: { x: number; y: number }[];
  } {
    const halfSize = size / 2;
    const depthOffset = size * this.DEPTH_RATIO;
    const angleRad = (this.ISOMETRIC_ANGLE * Math.PI) / 180;

    // アイソメトリック投影での変位計算
    const cos30 = Math.cos(angleRad);
    const sin30 = Math.sin(angleRad);

    // 基準点からの相対座標
    const dx = depthOffset * cos30;
    const dy = depthOffset * sin30;

    return {
      // 上面（六角形的な形状）
      top: [
        { x: x - halfSize, y: y - halfSize - dy },
        { x: x + halfSize, y: y - halfSize - dy },
        { x: x + halfSize + dx, y: y - dy },
        { x: x + dx, y: y + halfSize - dy },
        { x: x - halfSize + dx, y: y + halfSize - dy },
        { x: x - halfSize, y: y - dy },
      ],

      // 左面（平行四辺形）
      left: [
        { x: x - halfSize, y: y - dy },
        { x: x - halfSize, y: y + halfSize - dy },
        { x: x - halfSize, y: y + halfSize },
        { x: x - halfSize, y: y },
      ],

      // 右面（平行四辺形）
      right: [
        { x: x + halfSize, y: y - halfSize - dy },
        { x: x + halfSize + dx, y: y - dy },
        { x: x + halfSize + dx, y: y + halfSize - dy + halfSize },
        { x: x + halfSize, y: y + halfSize },
      ],
    };
  }

  /**
   * CSS Transform用の値を計算
   */
  static calculateTransforms(
    x: number,
    y: number,
    size: number
  ): {
    top: string;
    left: string;
    right: string;
  } {
    const vertices = this.calculateFaceVertices(x, y, size);

    // 上面のtransform（translateとrotateの組み合わせ）
    const topTransform = `translate3d(${x}px, ${y}px, 0) rotateX(-60deg) rotateZ(45deg)`;

    // 左面のtransform
    const leftTransform = `translate3d(${x}px, ${y}px, 0) rotateY(30deg) rotateX(-30deg)`;

    // 右面のtransform
    const rightTransform = `translate3d(${x}px, ${y}px, 0) rotateY(-30deg) rotateX(-30deg)`;

    return {
      top: topTransform,
      left: leftTransform,
      right: rightTransform,
    };
  }
}

/**
 * CSS色調整ユーティリティ
 */
export class CssCubeColorAdjuster {
  /**
   * 知覚輝度を計算（WCAG基準）
   */
  static getPerceptualBrightness(r: number, g: number, b: number): number {
    // sRGB to linear RGB
    const srgbToLinear = (c: number): number => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const rLinear = srgbToLinear(r);
    const gLinear = srgbToLinear(g);
    const bLinear = srgbToLinear(b);

    // 相対輝度計算
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  /**
   * 立方体の3面用の色を生成
   */
  static generateCubeFaceColors(baseColor: CubeColor): {
    top: string;
    left: string;
    right: string;
  } {
    const { r, g, b } = baseColor;

    // 知覚輝度ベースの調整係数
    const brightness = this.getPerceptualBrightness(r, g, b);
    const brightnessFactor = Math.max(
      0.3,
      Math.min(1.7, 1 / (brightness + 0.1))
    );

    // 各面の明度調整（上面: 120%, 左面: 100%, 右面: 70%）
    const topBrightness = Math.min(255, brightnessFactor * 1.2);
    const leftBrightness = brightnessFactor;
    const rightBrightness = brightnessFactor * 0.7;

    const adjustColor = (color: number, factor: number): number => {
      return Math.round(Math.min(255, Math.max(0, color * factor)));
    };

    return {
      top: `rgb(${adjustColor(r, topBrightness)}, ${adjustColor(g, topBrightness)}, ${adjustColor(b, topBrightness)})`,
      left: `rgb(${adjustColor(r, leftBrightness)}, ${adjustColor(g, leftBrightness)}, ${adjustColor(b, leftBrightness)})`,
      right: `rgb(${adjustColor(r, rightBrightness)}, ${adjustColor(g, rightBrightness)}, ${adjustColor(b, rightBrightness)})`,
    };
  }
}

/**
 * CSSレイアウトマネージャー
 */
export class CssCubeLayoutManager {
  /**
   * グリッドレイアウト計算
   */
  static calculateGridPositions(
    colors: CubeColor[],
    containerWidth: number,
    containerHeight: number,
    cubeSize: number
  ): CubePosition[] {
    const cols = Math.floor(containerWidth / (cubeSize * 1.5));
    const rows = Math.ceil(colors.length / cols);

    const totalWidth = cols * cubeSize * 1.5;
    const totalHeight = rows * cubeSize * 1.2;

    const startX = (containerWidth - totalWidth) / 2;
    const startY = (containerHeight - totalHeight) / 2;

    return colors.map((_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      return {
        x: startX + col * cubeSize * 1.5 + cubeSize / 2,
        y: startY + row * cubeSize * 1.2 + cubeSize / 2,
        size: cubeSize,
      };
    });
  }

  /**
   * 円形レイアウト計算
   */
  static calculateCircularPositions(
    colors: CubeColor[],
    centerX: number,
    centerY: number,
    radius: number,
    cubeSize: number
  ): CubePosition[] {
    const angleStep = (2 * Math.PI) / colors.length;

    return colors.map((_, index) => {
      const angle = index * angleStep;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        size: cubeSize,
      };
    });
  }

  /**
   * スパイラルレイアウト計算
   */
  static calculateSpiralPositions(
    colors: CubeColor[],
    centerX: number,
    centerY: number,
    spacing: number,
    cubeSize: number
  ): CubePosition[] {
    const spiralStep = spacing / colors.length;

    return colors.map((_, index) => {
      const angle = index * 0.5;
      const radius = index * spiralStep;

      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        size: cubeSize,
      };
    });
  }
}

/**
 * CSS Transform擬似立方体レンダラー
 */
export class CssCubeRenderer {
  private container: HTMLElement;
  private cubeElements: Map<string, HTMLElement> = new Map();
  private config: CssCubeConfig;

  constructor(container: HTMLElement, config?: Partial<CssCubeConfig>) {
    this.container = container;
    this.config = {
      enableHardwareAcceleration: true,
      useWillChange: true,
      enable3dTransforms: true,
      optimizeForMobile: true,
      ...config,
    };

    this.setupContainer();
  }

  /**
   * コンテナの初期設定
   */
  private setupContainer(): void {
    // CSS 3D空間の設定
    this.container.style.position = 'relative';
    this.container.style.transformStyle = 'preserve-3d';
    this.container.style.perspective = '1000px';
    this.container.style.overflow = 'hidden';

    // ハードウェアアクセラレーション
    if (this.config.enableHardwareAcceleration) {
      this.container.style.transform = 'translateZ(0)'; // force GPU layer
      this.container.style.backfaceVisibility = 'hidden';
    }

    // モバイル最適化
    if (this.config.optimizeForMobile) {
      this.container.style.webkitTransform = 'translateZ(0)';
      this.container.style.webkitBackfaceVisibility = 'hidden';
    }
  }

  /**
   * 複数立方体のレンダリング
   */
  renderCubes(colors: CubeColor[], positions: CubePosition[]): void {
    this.clearCubes();

    colors.forEach((color, index) => {
      if (index < positions.length) {
        this.renderSingleCube(color, positions[index], `cube-${index}`);
      }
    });
  }

  /**
   * 単一立方体のレンダリング
   */
  private renderSingleCube(
    color: CubeColor,
    position: CubePosition,
    id: string
  ): void {
    const cubeGroup = document.createElement('div');
    cubeGroup.className = 'css-cube-group';
    cubeGroup.setAttribute('data-cube-id', id);

    // グループのスタイル設定
    cubeGroup.style.position = 'absolute';
    cubeGroup.style.transformStyle = 'preserve-3d';
    cubeGroup.style.transform = `translate3d(${position.x - position.size / 2}px, ${position.y - position.size / 2}px, 0)`;

    if (this.config.useWillChange) {
      cubeGroup.style.willChange = 'transform';
    }

    // 色計算
    const colors = CssCubeColorAdjuster.generateCubeFaceColors(color);

    // 3つの面を作成
    const topFace = this.createFace('top', colors.top, position.size);
    const leftFace = this.createFace('left', colors.left, position.size);
    const rightFace = this.createFace('right', colors.right, position.size);

    // Z-orderで正しく重ねる：右面→左面→上面
    cubeGroup.appendChild(rightFace);
    cubeGroup.appendChild(leftFace);
    cubeGroup.appendChild(topFace);

    // インタラクション追加
    this.addInteractionHandlers(cubeGroup, color);

    this.container.appendChild(cubeGroup);
    this.cubeElements.set(id, cubeGroup);
  }

  /**
   * 立方体の面要素を作成
   */
  private createFace(
    faceType: 'top' | 'left' | 'right',
    color: string,
    size: number
  ): HTMLElement {
    const face = document.createElement('div');
    face.className = `css-cube-face css-cube-face-${faceType}`;

    // 基本スタイル
    face.style.position = 'absolute';
    face.style.width = `${size}px`;
    face.style.height = `${size}px`;
    face.style.backgroundColor = color;
    face.style.border = '1px solid rgba(0,0,0,0.1)';

    // ハードウェアアクセラレーション
    if (this.config.enableHardwareAcceleration) {
      face.style.backfaceVisibility = 'hidden';
      face.style.transform = 'translateZ(0)';
    }

    // 面ごとの3D変形
    switch (faceType) {
      case 'top':
        // 上面：X軸回転で平面を傾ける
        face.style.transform = 'rotateX(-60deg) translateZ(1px)';
        face.style.transformOrigin = 'bottom center';
        break;

      case 'left':
        // 左面：Y軸回転
        face.style.transform = 'rotateY(-60deg) translateZ(1px)';
        face.style.transformOrigin = 'right center';
        break;

      case 'right':
        // 右面：Y軸とX軸の組み合わせ
        face.style.transform = `rotateY(30deg) rotateX(-30deg) translate3d(${size * 0.5}px, ${size * 0.25}px, 0)`;
        face.style.transformOrigin = 'left center';
        break;
    }

    return face;
  }

  /**
   * インタラクション（ホバー、クリック）の追加
   */
  private addInteractionHandlers(
    cubeGroup: HTMLElement,
    color: CubeColor
  ): void {
    // CSS transitionsでスムーズなアニメーション
    cubeGroup.style.transition =
      'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    cubeGroup.addEventListener('mouseenter', () => {
      cubeGroup.style.transform += ' scale3d(1.1, 1.1, 1.1)';

      // 面ごとに明るさ調整
      const faces = cubeGroup.querySelectorAll('.css-cube-face');
      faces.forEach((face) => {
        (face as HTMLElement).style.filter = 'brightness(1.2)';
      });
    });

    cubeGroup.addEventListener('mouseleave', () => {
      // 元のtransformを復元
      const position = this.getCubePosition(cubeGroup);
      if (position) {
        cubeGroup.style.transform = `translate3d(${position.x - position.size / 2}px, ${position.y - position.size / 2}px, 0)`;
      }

      const faces = cubeGroup.querySelectorAll('.css-cube-face');
      faces.forEach((face) => {
        (face as HTMLElement).style.filter = 'none';
      });
    });

    cubeGroup.addEventListener('click', () => {
      this.showColorInfo(color, cubeGroup);
    });

    // タッチデバイス対応
    cubeGroup.addEventListener('touchstart', (e) => {
      e.preventDefault();
      cubeGroup.dispatchEvent(new Event('mouseenter'));
    });

    cubeGroup.addEventListener('touchend', (e) => {
      e.preventDefault();
      setTimeout(() => cubeGroup.dispatchEvent(new Event('mouseleave')), 300);
    });
  }

  /**
   * 立方体の位置情報を取得
   */
  private getCubePosition(cubeGroup: HTMLElement): CubePosition | null {
    const transform = cubeGroup.style.transform;
    const match = transform.match(
      /translate3d\(([\\d.-]+)px,\s*([\\d.-]+)px,\s*([\\d.-]+)(?:px)?\)/
    );

    if (match) {
      const size = parseInt(
        (cubeGroup.querySelector('.css-cube-face') as HTMLElement)?.style
          .width || '0'
      );
      return {
        x: parseFloat(match[1]) + size / 2,
        y: parseFloat(match[2]) + size / 2,
        size,
      };
    }

    return null;
  }

  /**
   * 色情報表示
   */
  private showColorInfo(color: CubeColor, element: HTMLElement): void {
    const info = {
      rgb: `RGB(${color.r}, ${color.g}, ${color.b})`,
      hex: `#${((1 << 24) | (color.r << 16) | (color.g << 8) | color.b).toString(16).slice(1).toUpperCase()}`,
      brightness: color.brightness.toFixed(3),
      perceptualBrightness: CssCubeColorAdjuster.getPerceptualBrightness(
        color.r,
        color.g,
        color.b
      ).toFixed(3),
    };

    console.log('CSS Cube Color Info:', info);

    // カスタムイベント発火
    this.container.dispatchEvent(
      new CustomEvent('cubeColorSelected', {
        detail: { color, info, element },
      })
    );
  }

  /**
   * パフォーマンス測定
   */
  measurePerformance(): { renderTime: number; elementCount: number } {
    const startTime = performance.now();
    const elementCount =
      this.container.querySelectorAll('.css-cube-group').length;
    const endTime = performance.now();

    return {
      renderTime: endTime - startTime,
      elementCount,
    };
  }

  /**
   * クリーンアップ
   */
  clearCubes(): void {
    this.cubeElements.forEach((element) => {
      element.remove();
    });
    this.cubeElements.clear();
  }

  /**
   * 設定の更新
   */
  updateConfig(newConfig: Partial<CssCubeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.setupContainer();
  }

  /**
   * アニメーション付きクリア
   */
  clearWithAnimation(duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      const cubes = Array.from(this.cubeElements.values());

      cubes.forEach((cube, index) => {
        setTimeout(() => {
          cube.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
          cube.style.transform += ' scale3d(0, 0, 0)';
          cube.style.opacity = '0';

          if (index === cubes.length - 1) {
            setTimeout(() => {
              this.clearCubes();
              resolve();
            }, duration);
          }
        }, index * 50);
      });
    });
  }
}
