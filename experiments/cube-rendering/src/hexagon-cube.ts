/**
 * 六角形ベースの2D擬似立方体実装
 * アイソメトリック風視覚効果でパレット色を立体的に表現
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

export interface CubeFaces {
  top: string; // 上面の色（最も明るい）
  left: string; // 左面の色（中間の明度）
  right: string; // 右面の色（最も暗い）
}

/**
 * 六角形の立方体ジオメトリ計算
 */
export class HexagonCubeGeometry {
  /**
   * 六角形の頂点座標を計算（上面用）
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
   * アイソメトリック投影で立方体の3面を計算
   */
  static getCubeFaces(
    centerX: number,
    centerY: number,
    size: number
  ): {
    top: [number, number][];
    left: [number, number][];
    right: [number, number][];
  } {
    const height = size * 0.8; // 立方体の高さ
    const perspective = size * 0.3; // 奥行き効果

    // 上面（六角形）
    const top = this.getHexagonVertices(centerX, centerY, size);

    // 左面（平行四辺形）
    const left: [number, number][] = [
      [centerX - size * 0.866, centerY - size * 0.5], // 左上
      [centerX - size * 0.866, centerY + size * 0.5], // 左下
      [centerX - size * 0.866 - perspective, centerY + size * 0.5 + height], // 左下奥
      [centerX - size * 0.866 - perspective, centerY - size * 0.5 + height], // 左上奥
    ];

    // 右面（平行四辺形）
    const right: [number, number][] = [
      [centerX + size * 0.866, centerY - size * 0.5], // 右上
      [centerX + size * 0.866 - perspective, centerY - size * 0.5 + height], // 右上奥
      [centerX + size * 0.866 - perspective, centerY + size * 0.5 + height], // 右下奥
      [centerX + size * 0.866, centerY + size * 0.5], // 右下
    ];

    return { top, left, right };
  }
}

/**
 * 色の明度調整ユーティリティ
 */
export class ColorBrightnessAdjuster {
  /**
   * 基準色から3面の色を生成（明度差を適用）
   */
  static generateCubeFaceColors(baseColor: CubeColor): CubeFaces {
    const { r, g, b } = baseColor;

    // 上面: 最も明るい（120%）
    const topBrightness = 1.2;
    const top = `rgb(${Math.min(255, Math.round(r * topBrightness))}, ${Math.min(255, Math.round(g * topBrightness))}, ${Math.min(255, Math.round(b * topBrightness))})`;

    // 左面: 基準色（100%）
    const left = `rgb(${r}, ${g}, ${b})`;

    // 右面: 最も暗い（70%）
    const rightBrightness = 0.7;
    const right = `rgb(${Math.round(r * rightBrightness)}, ${Math.round(g * rightBrightness)}, ${Math.round(b * rightBrightness)})`;

    return { top, left, right };
  }

  /**
   * 知覚輝度を計算（WCAG準拠）
   */
  static getPerceptualBrightness(r: number, g: number, b: number): number {
    // sRGB to Linear
    const rLinear =
      r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gLinear =
      g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bLinear =
      b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    // ITU-R BT.709 relative luminance
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }
}

/**
 * Canvas 2D で六角形立方体を描画
 */
export class Canvas2DCubeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hoveredCube: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = ctx;
    this.setupEventListeners();
  }

  /**
   * 複数の立方体を描画
   */
  renderCubes(colors: CubeColor[], positions: CubePosition[]): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    colors.forEach((color, index) => {
      const position = positions[index];
      if (position) {
        this.drawCube(color, position, index === this.hoveredCube);
      }
    });
  }

  /**
   * 単一の立方体を描画
   */
  private drawCube(
    color: CubeColor,
    position: CubePosition,
    isHovered: boolean
  ): void {
    const { x, y, size } = position;
    const cubeSize = isHovered ? size * 1.1 : size; // ホバー効果

    const faces = HexagonCubeGeometry.getCubeFaces(x, y, cubeSize);
    const colors = ColorBrightnessAdjuster.generateCubeFaceColors(color);

    // 奥から手前の順で描画（Z-buffer効果）
    this.drawFace(faces.left, colors.left);
    this.drawFace(faces.right, colors.right);
    this.drawFace(faces.top, colors.top);

    // 境界線を描画
    this.drawFaceOutline(faces.left);
    this.drawFaceOutline(faces.right);
    this.drawFaceOutline(faces.top);
  }

  /**
   * 面を塗りつぶし
   */
  private drawFace(vertices: [number, number][], fillColor: string): void {
    this.ctx.fillStyle = fillColor;
    this.ctx.beginPath();
    this.ctx.moveTo(vertices[0][0], vertices[0][1]);

    for (let i = 1; i < vertices.length; i++) {
      this.ctx.lineTo(vertices[i][0], vertices[i][1]);
    }

    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * 面の境界線を描画
   */
  private drawFaceOutline(vertices: [number, number][]): void {
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(vertices[0][0], vertices[0][1]);

    for (let i = 1; i < vertices.length; i++) {
      this.ctx.lineTo(vertices[i][0], vertices[i][1]);
    }

    this.ctx.closePath();
    this.ctx.stroke();
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (event: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // ホバー検出（簡易的な実装）
      const previousHovered = this.hoveredCube;
      this.hoveredCube = this.detectHoveredCube(x, y);

      if (previousHovered !== this.hoveredCube) {
        // 再描画が必要な場合のコールバック
        this.onHoverChange?.(this.hoveredCube);
      }
    });
  }

  /**
   * ホバーされている立方体を検出
   */
  private detectHoveredCube(mouseX: number, mouseY: number): number | null {
    // 簡易的な実装：距離ベースの検出
    // 実際の実装では各立方体の境界を正確に判定する
    return null;
  }

  /**
   * ホバー状態変更時のコールバック
   */
  onHoverChange?: (cubeIndex: number | null) => void;
}

/**
 * グリッドレイアウトで立方体の位置を計算
 */
export class CubeLayoutManager {
  /**
   * グリッド配置で立方体の位置を計算
   */
  static calculateGridPositions(
    colors: CubeColor[],
    canvasWidth: number,
    canvasHeight: number,
    cubeSize: number = 40
  ): CubePosition[] {
    const cols = Math.ceil(Math.sqrt(colors.length));
    const rows = Math.ceil(colors.length / cols);

    const totalWidth = cols * cubeSize * 2.5;
    const totalHeight = rows * cubeSize * 2.5;

    const startX = (canvasWidth - totalWidth) / 2 + cubeSize;
    const startY = (canvasHeight - totalHeight) / 2 + cubeSize;

    return colors.map((_, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      return {
        x: startX + col * cubeSize * 2.5,
        y: startY + row * cubeSize * 2.5,
        size: cubeSize,
      };
    });
  }

  /**
   * 円形配置で立方体の位置を計算
   */
  static calculateCircularPositions(
    colors: CubeColor[],
    centerX: number,
    centerY: number,
    radius: number,
    cubeSize: number = 40
  ): CubePosition[] {
    const angleStep = (Math.PI * 2) / colors.length;

    return colors.map((_, index) => {
      const angle = angleStep * index;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      return { x, y, size: cubeSize };
    });
  }
}
