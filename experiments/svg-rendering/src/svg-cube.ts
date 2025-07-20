/**
 * SVGベース六角形立方体レンダリングエンジン
 * ベクター形式、スケーラブル、アニメーション対応
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

export interface SvgCubeFaces {
  top: string;
  left: string;
  right: string;
}

/**
 * SVG立方体の幾何計算クラス
 * Canvas版から移植し、SVGパス文字列生成に特化
 */
export class SvgCubeGeometry {
  /**
   * 六角形頂点をSVGパス文字列として生成
   */
  static getHexagonPath(
    centerX: number,
    centerY: number,
    size: number
  ): string {
    const vertices = this.getHexagonVertices(centerX, centerY, size);
    const pathData = vertices
      .map((vertex, index) => {
        const [x, y] = vertex;
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(' ');

    return `${pathData} Z`;
  }

  /**
   * 六角形頂点座標計算（Canvas版と同じ）
   */
  static getHexagonVertices(
    centerX: number,
    centerY: number,
    size: number
  ): [number, number][] {
    const vertices: [number, number][] = [];
    const angleStep = (Math.PI * 2) / 6;

    for (let i = 0; i < 6; i++) {
      const angle = angleStep * i - Math.PI / 2; // 上から開始
      const x = centerX + Math.cos(angle) * size;
      const y = centerY + Math.sin(angle) * size;
      vertices.push([x, y]);
    }

    return vertices;
  }

  /**
   * 立方体の3面をSVGパス文字列として生成
   */
  static getCubeFacePaths(
    centerX: number,
    centerY: number,
    size: number
  ): SvgCubeFaces {
    const depth = size * 0.7; // 奥行き係数
    const perspectiveX = size * 0.5; // X軸遠近
    const perspectiveY = depth * 0.3; // Y軸遠近

    // 上面（六角形）
    const topPath = this.getHexagonPath(centerX, centerY, size);

    // 左面（平行四辺形）
    const leftTopX = centerX - size * 0.866; // cos(30°) * size
    const leftTopY = centerY - size * 0.5; // sin(30°) * size
    const leftBottomX = leftTopX - perspectiveX;
    const leftBottomY = leftTopY + perspectiveY;

    const leftPath = [
      `M ${leftTopX} ${leftTopY}`,
      `L ${leftBottomX} ${leftBottomY}`,
      `L ${leftBottomX} ${leftBottomY + size}`,
      `L ${leftTopX} ${leftTopY + size}`,
      'Z',
    ].join(' ');

    // 右面（平行四辺形）
    const rightTopX = centerX + size * 0.866;
    const rightTopY = centerY - size * 0.5;
    const rightBottomX = rightTopX + perspectiveX;
    const rightBottomY = rightTopY + perspectiveY;

    const rightPath = [
      `M ${rightTopX} ${rightTopY}`,
      `L ${rightBottomX} ${rightBottomY}`,
      `L ${rightBottomX} ${rightBottomY + size}`,
      `L ${rightTopX} ${rightTopY + size}`,
      'Z',
    ].join(' ');

    return {
      top: topPath,
      left: leftPath,
      right: rightPath,
    };
  }
}

/**
 * SVG用色調整クラス
 * Canvas版の実装を踏襲
 */
export class SvgColorBrightnessAdjuster {
  /**
   * 立方体3面の色を生成（SVG fill色として）
   */
  static generateCubeFaceColors(baseColor: CubeColor): SvgCubeFaces {
    const brightnessMultipliers = {
      top: 1.2, // 明るい上面
      left: 1.0, // 標準左面
      right: 0.7, // 暗い右面
    };

    const adjustColor = (multiplier: number): string => {
      const perceptualBrightness = this.getPerceptualBrightness(
        baseColor.r / 255,
        baseColor.g / 255,
        baseColor.b / 255
      );

      const effectiveBrightness = baseColor.brightness * perceptualBrightness;
      const adjustmentFactor = Math.pow(effectiveBrightness, 0.5) * multiplier;

      const r = Math.min(255, Math.floor(baseColor.r * adjustmentFactor));
      const g = Math.min(255, Math.floor(baseColor.g * adjustmentFactor));
      const b = Math.min(255, Math.floor(baseColor.b * adjustmentFactor));

      return `rgb(${r}, ${g}, ${b})`;
    };

    return {
      top: adjustColor(brightnessMultipliers.top),
      left: adjustColor(brightnessMultipliers.left),
      right: adjustColor(brightnessMultipliers.right),
    };
  }

  /**
   * WCAG準拠の知覚輝度計算
   */
  static getPerceptualBrightness(r: number, g: number, b: number): number {
    // sRGB係数（WCAG 2.1準拠）
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}

/**
 * SVG立方体レンダラークラス
 * DOM操作によるSVG要素生成・管理
 */
export class SvgCubeRenderer {
  private svg: SVGElement;
  private cubeGroups: Map<string, SVGGElement> = new Map();
  private animationEnabled: boolean = false;

  constructor(svgElement: SVGElement) {
    this.svg = svgElement;
    this.setupSvgContainer();
  }

  /**
   * SVGコンテナの基本設定
   */
  private setupSvgContainer(): void {
    this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    this.svg.style.userSelect = 'none';
    this.svg.style.overflow = 'visible';
  }

  /**
   * 複数の立方体をレンダリング
   */
  renderCubes(colors: CubeColor[], positions: CubePosition[]): void {
    // 既存の立方体をクリア
    this.clearCubes();

    colors.forEach((color, index) => {
      if (index < positions.length) {
        this.renderSingleCube(color, positions[index], `cube-${index}`);
      }
    });
  }

  /**
   * 単一の立方体をレンダリング
   */
  private renderSingleCube(
    color: CubeColor,
    position: CubePosition,
    id: string
  ): void {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', id);
    group.setAttribute('class', 'svg-cube');

    // アニメーション有効時の初期状態
    if (this.animationEnabled) {
      group.style.opacity = '0';
      group.style.transform = 'scale(0.8)';
    }

    // 幾何とカラー計算
    const faces = SvgCubeGeometry.getCubeFacePaths(
      position.x,
      position.y,
      position.size
    );
    const colors = SvgColorBrightnessAdjuster.generateCubeFaceColors(color);

    // Z-order: 右面→左面→上面（最前面）
    this.createFaceElement(group, faces.right, colors.right, 'right-face');
    this.createFaceElement(group, faces.left, colors.left, 'left-face');
    this.createFaceElement(group, faces.top, colors.top, 'top-face');

    // ホバー効果とインタラクション
    this.addInteractionHandlers(group, color);

    this.svg.appendChild(group);
    this.cubeGroups.set(id, group);

    // アニメーション実行
    if (this.animationEnabled) {
      this.animateIn(group);
    }
  }

  /**
   * 個別面要素の作成
   */
  private createFaceElement(
    group: SVGGElement,
    pathData: string,
    fillColor: string,
    className: string
  ): void {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', fillColor);
    path.setAttribute('stroke', 'rgba(0,0,0,0.1)');
    path.setAttribute('stroke-width', '0.5');
    path.setAttribute('class', className);

    // SVG特有のスムージング
    path.style.shapeRendering = 'geometricPrecision';

    group.appendChild(path);
  }

  /**
   * インタラクション（ホバー効果等）の追加
   */
  private addInteractionHandlers(group: SVGGElement, color: CubeColor): void {
    // ホバー効果
    group.addEventListener('mouseenter', () => {
      group.style.transform = 'scale(1.1)';
      group.style.transformOrigin = 'center';
      group.style.transition = 'transform 0.2s ease';
      group.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';
    });

    group.addEventListener('mouseleave', () => {
      group.style.transform = 'scale(1)';
      group.style.filter = 'none';
    });

    // クリック時の色情報表示
    group.addEventListener('click', () => {
      this.showColorInfo(color);
    });

    // タッチデバイス対応
    group.addEventListener('touchstart', (e) => {
      e.preventDefault();
      group.dispatchEvent(new Event('mouseenter'));
    });
  }

  /**
   * 色情報の表示
   */
  private showColorInfo(color: CubeColor): void {
    const info = `RGB(${color.r}, ${color.g}, ${color.b})\nBrightness: ${color.brightness.toFixed(2)}`;
    console.log('Color Info:', info);

    // 実装例：カスタムイベントの発火
    this.svg.dispatchEvent(
      new CustomEvent('cubeColorSelected', {
        detail: { color, info },
      })
    );
  }

  /**
   * アニメーション有効化
   */
  enableAnimation(): void {
    this.animationEnabled = true;
  }

  /**
   * アニメーション無効化
   */
  disableAnimation(): void {
    this.animationEnabled = false;
  }

  /**
   * 立方体のアニメーション表示
   */
  private animateIn(group: SVGGElement): void {
    // CSS transitionsを使用したアニメーション
    group.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

    // 少し遅延してアニメーション開始
    setTimeout(() => {
      group.style.opacity = '1';
      group.style.transform = 'scale(1)';
    }, 50);
  }

  /**
   * 既存の立方体をクリア
   */
  clearCubes(): void {
    this.cubeGroups.forEach((group) => {
      group.remove();
    });
    this.cubeGroups.clear();
  }

  /**
   * 特定の立方体を取得
   */
  getCube(id: string): SVGGElement | undefined {
    return this.cubeGroups.get(id);
  }

  /**
   * SVGの内容をエクスポート
   */
  exportSvg(): string {
    return this.svg.outerHTML;
  }
}

/**
 * SVG立方体レイアウト管理クラス
 * Canvas版と同じアルゴリズムを使用
 */
export class SvgCubeLayoutManager {
  /**
   * グリッドレイアウトの位置計算
   */
  static calculateGridPositions(
    colors: CubeColor[],
    containerWidth: number,
    containerHeight: number,
    cubeSize: number
  ): CubePosition[] {
    const positions: CubePosition[] = [];
    const cols = Math.ceil(Math.sqrt(colors.length));
    const rows = Math.ceil(colors.length / cols);

    const spacing = cubeSize * 2.5;
    const totalWidth = (cols - 1) * spacing;
    const totalHeight = (rows - 1) * spacing;

    const startX = (containerWidth - totalWidth) / 2;
    const startY = (containerHeight - totalHeight) / 2;

    colors.forEach((_, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      positions.push({
        x: startX + col * spacing,
        y: startY + row * spacing,
        size: cubeSize,
      });
    });

    return positions;
  }

  /**
   * 円形レイアウトの位置計算
   */
  static calculateCircularPositions(
    colors: CubeColor[],
    centerX: number,
    centerY: number,
    radius: number,
    cubeSize: number
  ): CubePosition[] {
    const positions: CubePosition[] = [];
    const angleStep = (Math.PI * 2) / colors.length;

    colors.forEach((_, index) => {
      const angle = angleStep * index - Math.PI / 2; // 上から開始
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      positions.push({ x, y, size: cubeSize });
    });

    return positions;
  }

  /**
   * スパイラルレイアウト（SVG特有の追加レイアウト）
   */
  static calculateSpiralPositions(
    colors: CubeColor[],
    centerX: number,
    centerY: number,
    initialRadius: number,
    cubeSize: number
  ): CubePosition[] {
    const positions: CubePosition[] = [];
    const radiusGrowth = cubeSize * 0.8;
    const angleStep = Math.PI / 3; // 60度ずつ

    colors.forEach((_, index) => {
      const spiral = index * 0.5;
      const angle = angleStep * index;
      const radius = initialRadius + spiral * radiusGrowth;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      positions.push({ x, y, size: cubeSize });
    });

    return positions;
  }
}
