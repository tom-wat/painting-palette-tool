import type {
  Point2D,
  Point3D,
  ColorData,
  PerformanceMetrics,
} from './types.js';

export class Canvas2DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private metrics: PerformanceMetrics = {
    fps: 0,
    renderTime: 0,
    memoryUsage: 0,
    frameCount: 0,
  };
  private lastTime = 0;
  private frameHistory: number[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not supported');
    this.ctx = ctx;

    this.setupCanvas();
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  start(colors: ColorData[]): void {
    this.stop();
    this.lastTime = performance.now();
    this.frameHistory = [];
    this.animate(colors);
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate(colors: ColorData[]): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    const renderStart = performance.now();
    this.render(colors, currentTime);
    const renderTime = performance.now() - renderStart;

    this.updateMetrics(deltaTime, renderTime);
    this.lastTime = currentTime;

    this.animationId = requestAnimationFrame(() => this.animate(colors));
  }

  private render(colors: ColorData[], time: number): void {
    const { width, height } = this.canvas.getBoundingClientRect();

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Set up isometric view
    const centerX = width / 2;
    const centerY = height / 2;
    const cubeSize = Math.min(width, height) * 0.3;

    // Rotation animation
    const rotation = (time * 0.001) % (Math.PI * 2);

    // Calculate isometric cube points
    const points = this.calculateIsometricPoints(
      centerX,
      centerY,
      cubeSize,
      rotation
    );

    // Draw cube faces
    this.drawCubeFaces(points, colors);
  }

  private calculateIsometricPoints(
    centerX: number,
    centerY: number,
    size: number,
    rotation: number
  ): {
    faces: { points: Point2D[]; zDepth: number; name: string }[];
  } {
    const cos30 = Math.cos(Math.PI / 6); // 30度
    const sin30 = Math.sin(Math.PI / 6);

    // 基本的な立方体の頂点（アイソメトリック投影）
    const vertices3D: Point3D[] = [
      { x: -1, y: -1, z: -1 }, // 0: left-bottom-back
      { x: 1, y: -1, z: -1 }, // 1: right-bottom-back
      { x: 1, y: 1, z: -1 }, // 2: right-top-back
      { x: -1, y: 1, z: -1 }, // 3: left-top-back
      { x: -1, y: -1, z: 1 }, // 4: left-bottom-front
      { x: 1, y: -1, z: 1 }, // 5: right-bottom-front
      { x: 1, y: 1, z: 1 }, // 6: right-top-front
      { x: -1, y: 1, z: 1 }, // 7: left-top-front
    ];

    // 回転とアイソメトリック投影を適用
    const projectedVertices: { point: Point2D; z: number }[] = vertices3D.map(
      (v) => {
        // Y軸回転
        const rotatedX = v.x * Math.cos(rotation) - v.z * Math.sin(rotation);
        const rotatedZ = v.x * Math.sin(rotation) + v.z * Math.cos(rotation);
        const rotatedY = v.y;

        // アイソメトリック投影
        const isoX = (rotatedX - rotatedZ) * cos30;
        const isoY = (rotatedX + rotatedZ) * sin30 - rotatedY;

        return {
          point: {
            x: centerX + isoX * size * 0.5,
            y: centerY + isoY * size * 0.5,
          },
          z: rotatedZ, // Z深度（描画順序用）
        };
      }
    );

    // 6つの面を定義
    const faceDefinitions = [
      { indices: [4, 5, 6, 7], name: 'front' }, // 前面
      { indices: [1, 0, 3, 2], name: 'back' }, // 後面
      { indices: [0, 4, 7, 3], name: 'left' }, // 左面
      { indices: [5, 1, 2, 6], name: 'right' }, // 右面
      { indices: [7, 6, 2, 3], name: 'top' }, // 上面
      { indices: [0, 1, 5, 4], name: 'bottom' }, // 下面
    ];

    const faces = faceDefinitions.map((face) => {
      const points = face.indices.map((i) => projectedVertices[i].point);
      // 面の中心のZ座標を計算（描画順序用）
      const avgZ =
        face.indices.reduce((sum, i) => sum + projectedVertices[i].z, 0) / 4;

      return {
        points,
        zDepth: avgZ,
        name: face.name,
      };
    });

    // Z深度でソート（奥から手前へ）
    faces.sort((a, b) => a.zDepth - b.zDepth);

    return { faces };
  }

  private drawCubeFaces(
    points: { faces: { points: Point2D[]; zDepth: number; name: string }[] },
    colors: ColorData[]
  ): void {
    const highlights = colors.filter((c) => c.role === 'highlight');
    const midtones = colors.filter((c) => c.role === 'midtone');
    const shadows = colors.filter((c) => c.role === 'shadow');

    // 各面に適切な色とブライトネスを適用
    points.faces.forEach((face) => {
      let faceColors: ColorData[] = [];
      let brightness = 1.0;

      switch (face.name) {
        case 'top':
          faceColors = highlights.length > 0 ? highlights : colors.slice(0, 2);
          brightness = 1.0;
          break;
        case 'front':
          faceColors = midtones.length > 0 ? midtones : colors.slice(2, 4);
          brightness = 0.9;
          break;
        case 'right':
          faceColors = shadows.length > 0 ? shadows : colors.slice(4, 6);
          brightness = 0.7;
          break;
        case 'left':
          faceColors = midtones.length > 0 ? midtones : colors.slice(1, 3);
          brightness = 0.8;
          break;
        case 'back':
          faceColors = shadows.length > 0 ? shadows : colors.slice(3, 5);
          brightness = 0.6;
          break;
        case 'bottom':
          faceColors = shadows.length > 0 ? shadows : colors.slice(4, 6);
          brightness = 0.5;
          break;
      }

      if (faceColors.length > 0) {
        this.drawFace(face.points, faceColors, brightness);
      }
    });
  }

  private drawFace(
    points: Point2D[],
    colors: ColorData[],
    brightness: number
  ): void {
    if (colors.length === 0) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();

    if (colors.length === 1) {
      // 単色で塗りつぶし
      const rgb = colors[0].rgb;
      const adjustedColor = rgb.map((c) => Math.floor(c * brightness));
      this.ctx.fillStyle = `rgb(${adjustedColor[0]}, ${adjustedColor[1]}, ${adjustedColor[2]})`;
      this.ctx.fill();
    } else {
      // グラデーション
      const gradient = this.createGradient(points, colors, brightness);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }

    // エッジを描画
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private createGradient(
    points: Point2D[],
    colors: ColorData[],
    brightness: number
  ): CanvasGradient {
    const gradient = this.ctx.createLinearGradient(
      points[0].x,
      points[0].y,
      points[2].x,
      points[2].y
    );

    colors.forEach((color, index) => {
      const stop = index / (colors.length - 1);
      const rgb = color.rgb.map((c) => Math.floor(c * brightness));
      gradient.addColorStop(stop, `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
    });

    return gradient;
  }

  private updateMetrics(deltaTime: number, renderTime: number): void {
    this.metrics.frameCount++;
    this.metrics.renderTime = renderTime;

    // FPS計算
    const fps = 1000 / deltaTime;
    this.frameHistory.push(fps);

    // 過去30フレームの平均
    if (this.frameHistory.length > 30) {
      this.frameHistory.shift();
    }

    this.metrics.fps =
      this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length;

    // メモリ使用量（概算）
    if ('memory' in performance && (performance as any).memory) {
      this.metrics.memoryUsage =
        (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}
