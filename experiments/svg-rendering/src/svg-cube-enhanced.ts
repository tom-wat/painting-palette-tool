/**
 * 拡張SVG立方体レンダリングエンジン
 * CSS/SVGアニメーション、高DPI対応、レスポンシブ機能強化版
 */

import {
  CubeColor,
  CubePosition,
  SvgCubeFaces,
  SvgCubeGeometry,
  SvgColorBrightnessAdjuster,
} from './svg-cube.js';

export interface AnimationConfig {
  enabled: boolean;
  duration: number;
  easing: string;
  stagger: number; // アニメーション遅延（ms）
  type: 'fade' | 'scale' | 'slide' | 'rotate' | 'elastic';
}

export interface SvgCubeStyle {
  strokeWidth: number;
  strokeColor: string;
  strokeOpacity: number;
  shadows: boolean;
  gradients: boolean;
  highDpi: boolean;
}

/**
 * 拡張SVG立方体レンダラー
 * CSS3/SVGアニメーション、高品質レンダリング対応
 */
export class EnhancedSvgCubeRenderer {
  private svg: SVGElement;
  private cubeGroups: Map<string, SVGGElement> = new Map();
  private animationConfig: AnimationConfig;
  private styleConfig: SvgCubeStyle;
  private defsElement!: SVGDefsElement;
  private viewBoxInitialized: boolean = false;

  constructor(
    svgElement: SVGElement,
    animationConfig?: Partial<AnimationConfig>,
    styleConfig?: Partial<SvgCubeStyle>
  ) {
    this.svg = svgElement;
    this.animationConfig = {
      enabled: true,
      duration: 500,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      stagger: 100,
      type: 'scale',
      ...animationConfig,
    };
    this.styleConfig = {
      strokeWidth: 0.5,
      strokeColor: 'rgba(0,0,0,0.1)',
      strokeOpacity: 1,
      shadows: true,
      gradients: true,
      highDpi: true,
      ...styleConfig,
    };

    this.setupSvgContainer();
    this.createDefs();
  }

  /**
   * 高DPI対応SVGコンテナセットアップ
   */
  private setupSvgContainer(): void {
    this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    this.svg.style.userSelect = 'none';
    this.svg.style.overflow = 'visible';

    // 高DPI対応
    if (this.styleConfig.highDpi) {
      const pixelRatio = window.devicePixelRatio || 1;
      this.svg.style.shapeRendering =
        pixelRatio > 1 ? 'geometricPrecision' : 'auto';
    }

    // CSS variables for theming
    this.svg.style.setProperty(
      '--cube-stroke-width',
      this.styleConfig.strokeWidth.toString()
    );
    this.svg.style.setProperty(
      '--cube-stroke-color',
      this.styleConfig.strokeColor
    );
    this.svg.style.setProperty(
      '--animation-duration',
      `${this.animationConfig.duration}ms`
    );
    this.svg.style.setProperty(
      '--animation-easing',
      this.animationConfig.easing
    );
  }

  /**
   * SVG定義要素（グラデーション、シャドウ等）の作成
   */
  private createDefs(): void {
    this.defsElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'defs'
    );

    if (this.styleConfig.gradients) {
      this.createGradientDefinitions();
    }

    if (this.styleConfig.shadows) {
      this.createShadowFilters();
    }

    this.svg.appendChild(this.defsElement);
  }

  /**
   * グラデーション定義の作成
   */
  private createGradientDefinitions(): void {
    // 上面用グラデーション
    const topGradient = this.createLinearGradient('topFaceGradient', [
      { offset: '0%', stopColor: 'rgba(255,255,255,0.3)' },
      { offset: '100%', stopColor: 'rgba(255,255,255,0.1)' },
    ]);

    // 左面用グラデーション
    const leftGradient = this.createLinearGradient('leftFaceGradient', [
      { offset: '0%', stopColor: 'rgba(0,0,0,0.1)' },
      { offset: '100%', stopColor: 'rgba(0,0,0,0.3)' },
    ]);

    // 右面用グラデーション
    const rightGradient = this.createLinearGradient('rightFaceGradient', [
      { offset: '0%', stopColor: 'rgba(0,0,0,0.2)' },
      { offset: '100%', stopColor: 'rgba(0,0,0,0.5)' },
    ]);

    this.defsElement.appendChild(topGradient);
    this.defsElement.appendChild(leftGradient);
    this.defsElement.appendChild(rightGradient);
  }

  /**
   * リニアグラデーション要素の作成
   */
  private createLinearGradient(
    id: string,
    stops: Array<{ offset: string; stopColor: string }>
  ): SVGLinearGradientElement {
    const gradient = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'linearGradient'
    );
    gradient.setAttribute('id', id);

    stops.forEach((stop) => {
      const stopElement = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'stop'
      );
      stopElement.setAttribute('offset', stop.offset);
      stopElement.setAttribute('stop-color', stop.stopColor);
      gradient.appendChild(stopElement);
    });

    return gradient;
  }

  /**
   * シャドウフィルターの作成
   */
  private createShadowFilters(): void {
    // ドロップシャドウフィルター
    const filter = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'filter'
    );
    filter.setAttribute('id', 'cubeShadow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    const gaussianBlur = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'feGaussianBlur'
    );
    gaussianBlur.setAttribute('in', 'SourceAlpha');
    gaussianBlur.setAttribute('stdDeviation', '2');
    gaussianBlur.setAttribute('result', 'blur');

    const offset = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'feOffset'
    );
    offset.setAttribute('in', 'blur');
    offset.setAttribute('dx', '2');
    offset.setAttribute('dy', '2');
    offset.setAttribute('result', 'offsetBlur');

    const colorMatrix = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'feColorMatrix'
    );
    colorMatrix.setAttribute('in', 'offsetBlur');
    colorMatrix.setAttribute('values', '0 0 0 0.3 0');

    const merge = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'feMerge'
    );
    const mergeNode1 = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'feMergeNode'
    );
    mergeNode1.setAttribute('in', 'offsetBlur');
    const mergeNode2 = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'feMergeNode'
    );
    mergeNode2.setAttribute('in', 'SourceGraphic');

    merge.appendChild(mergeNode1);
    merge.appendChild(mergeNode2);

    filter.appendChild(gaussianBlur);
    filter.appendChild(offset);
    filter.appendChild(colorMatrix);
    filter.appendChild(merge);

    this.defsElement.appendChild(filter);
  }

  /**
   * 複数立方体のレンダリング（アニメーション付き）
   */
  renderCubes(colors: CubeColor[], positions: CubePosition[]): void {
    this.clearCubes();
    this.updateViewBox(positions);

    colors.forEach((color, index) => {
      if (index < positions.length) {
        const delay = this.animationConfig.enabled
          ? index * this.animationConfig.stagger
          : 0;
        setTimeout(() => {
          this.renderSingleCube(color, positions[index], `cube-${index}`);
        }, delay);
      }
    });
  }

  /**
   * ViewBoxの自動調整
   */
  private updateViewBox(positions: CubePosition[]): void {
    if (this.viewBoxInitialized || positions.length === 0) return;

    const margin = 50;
    const bounds = {
      minX: Math.min(...positions.map((p) => p.x - p.size)) - margin,
      maxX: Math.max(...positions.map((p) => p.x + p.size)) + margin,
      minY: Math.min(...positions.map((p) => p.y - p.size)) - margin,
      maxY: Math.max(...positions.map((p) => p.y + p.size)) + margin,
    };

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    this.svg.setAttribute(
      'viewBox',
      `${bounds.minX} ${bounds.minY} ${width} ${height}`
    );
    this.viewBoxInitialized = true;
  }

  /**
   * 拡張単一立方体レンダリング
   */
  private renderSingleCube(
    color: CubeColor,
    position: CubePosition,
    id: string
  ): void {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', id);
    group.setAttribute('class', 'enhanced-svg-cube');

    // CSS variables for this cube
    group.style.setProperty('--cube-x', position.x.toString());
    group.style.setProperty('--cube-y', position.y.toString());
    group.style.setProperty('--cube-size', position.size.toString());

    // 幾何とカラー計算
    const faces = SvgCubeGeometry.getCubeFacePaths(
      position.x,
      position.y,
      position.size
    );
    const colors = SvgColorBrightnessAdjuster.generateCubeFaceColors(color);

    // Z-order: 右面→左面→上面
    this.createEnhancedFaceElement(
      group,
      faces.right,
      colors.right,
      'right-face',
      'rightFaceGradient'
    );
    this.createEnhancedFaceElement(
      group,
      faces.left,
      colors.left,
      'left-face',
      'leftFaceGradient'
    );
    this.createEnhancedFaceElement(
      group,
      faces.top,
      colors.top,
      'top-face',
      'topFaceGradient'
    );

    // シャドウ適用
    if (this.styleConfig.shadows) {
      group.style.filter = 'url(#cubeShadow)';
    }

    // インタラクション追加
    this.addEnhancedInteractionHandlers(group, color);

    // アニメーション設定
    if (this.animationConfig.enabled) {
      this.applyEntryAnimation(group);
    }

    this.svg.appendChild(group);
    this.cubeGroups.set(id, group);
  }

  /**
   * 拡張面要素の作成（グラデーション対応）
   */
  private createEnhancedFaceElement(
    group: SVGGElement,
    pathData: string,
    fillColor: string,
    className: string,
    gradientId?: string
  ): void {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', fillColor);
    path.setAttribute('stroke', this.styleConfig.strokeColor);
    path.setAttribute('stroke-width', this.styleConfig.strokeWidth.toString());
    path.setAttribute(
      'stroke-opacity',
      this.styleConfig.strokeOpacity.toString()
    );
    path.setAttribute('class', className);

    // 高品質レンダリング設定
    path.style.shapeRendering = 'geometricPrecision';
    path.style.vectorEffect = 'non-scaling-stroke';

    // グラデーションオーバーレイ
    if (this.styleConfig.gradients && gradientId) {
      const overlay = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      );
      overlay.setAttribute('d', pathData);
      overlay.setAttribute('fill', `url(#${gradientId})`);
      overlay.setAttribute('class', `${className}-gradient`);
      group.appendChild(path);
      group.appendChild(overlay);
    } else {
      group.appendChild(path);
    }
  }

  /**
   * 拡張インタラクション（滑らかなアニメーション）
   */
  private addEnhancedInteractionHandlers(
    group: SVGGElement,
    color: CubeColor
  ): void {
    const transition = `transform ${this.animationConfig.duration * 0.3}ms ${this.animationConfig.easing}`;

    group.addEventListener('mouseenter', () => {
      group.style.transition = transition;
      group.style.transform = 'scale(1.1)';
      group.style.transformOrigin = 'center';

      if (this.styleConfig.shadows) {
        group.style.filter = 'url(#cubeShadow) brightness(1.1)';
      }
    });

    group.addEventListener('mouseleave', () => {
      group.style.transform = 'scale(1)';

      if (this.styleConfig.shadows) {
        group.style.filter = 'url(#cubeShadow)';
      }
    });

    // より詳細な色情報表示
    group.addEventListener('click', () => {
      this.showEnhancedColorInfo(color, group);
    });

    // タッチデバイス対応強化
    group.addEventListener('touchstart', (e) => {
      e.preventDefault();
      group.dispatchEvent(new Event('mouseenter'));
    });

    group.addEventListener('touchend', (e) => {
      e.preventDefault();
      setTimeout(() => group.dispatchEvent(new Event('mouseleave')), 300);
    });
  }

  /**
   * エントリーアニメーションの適用
   */
  private applyEntryAnimation(group: SVGGElement): void {
    const { type, duration, easing } = this.animationConfig;

    // 初期状態設定
    switch (type) {
      case 'fade':
        group.style.opacity = '0';
        break;
      case 'scale':
        group.style.opacity = '0';
        group.style.transform = 'scale(0.3)';
        break;
      case 'slide':
        group.style.opacity = '0';
        group.style.transform = 'translateY(-20px)';
        break;
      case 'rotate':
        group.style.opacity = '0';
        group.style.transform = 'rotate(180deg) scale(0.5)';
        break;
      case 'elastic':
        group.style.opacity = '0';
        group.style.transform = 'scale(0)';
        break;
    }

    group.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;
    group.style.transformOrigin = 'center';

    // アニメーション実行
    requestAnimationFrame(() => {
      group.style.opacity = '1';
      group.style.transform = 'scale(1) translateY(0) rotate(0deg)';
    });
  }

  /**
   * 拡張色情報表示
   */
  private showEnhancedColorInfo(color: CubeColor, group: SVGGElement): void {
    const rect = group.getBoundingClientRect();
    const info = {
      rgb: `RGB(${color.r}, ${color.g}, ${color.b})`,
      hex: `#${((1 << 24) | (color.r << 16) | (color.g << 8) | color.b).toString(16).slice(1).toUpperCase()}`,
      hsl: this.rgbToHsl(color.r, color.g, color.b),
      brightness: color.brightness.toFixed(3),
      perceptualBrightness: SvgColorBrightnessAdjuster.getPerceptualBrightness(
        color.r / 255,
        color.g / 255,
        color.b / 255
      ).toFixed(3),
    };

    console.log('Enhanced Color Info:', info);

    // カスタムイベント発火（詳細情報付き）
    this.svg.dispatchEvent(
      new CustomEvent('cubeColorSelected', {
        detail: {
          color,
          info,
          position: { x: rect.left, y: rect.top },
          element: group,
        },
      })
    );
  }

  /**
   * RGB to HSL変換ヘルパー
   */
  private rgbToHsl(r: number, g: number, b: number): string {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return `HSL(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }

  /**
   * アニメーション設定の更新
   */
  updateAnimationConfig(config: Partial<AnimationConfig>): void {
    this.animationConfig = { ...this.animationConfig, ...config };
    this.svg.style.setProperty(
      '--animation-duration',
      `${this.animationConfig.duration}ms`
    );
    this.svg.style.setProperty(
      '--animation-easing',
      this.animationConfig.easing
    );
  }

  /**
   * スタイル設定の更新
   */
  updateStyleConfig(config: Partial<SvgCubeStyle>): void {
    this.styleConfig = { ...this.styleConfig, ...config };
    this.svg.style.setProperty(
      '--cube-stroke-width',
      this.styleConfig.strokeWidth.toString()
    );
    this.svg.style.setProperty(
      '--cube-stroke-color',
      this.styleConfig.strokeColor
    );
  }

  /**
   * レスポンシブViewBox調整
   */
  adjustViewBoxToContainer(): void {
    const rect = this.svg.getBoundingClientRect();
    const aspectRatio = rect.width / rect.height;

    // コンテナに合わせてViewBoxを調整
    if (this.viewBoxInitialized) {
      const currentViewBox = this.svg
        .getAttribute('viewBox')
        ?.split(' ')
        .map(Number);
      if (currentViewBox && currentViewBox.length === 4) {
        const [x, y, width, height] = currentViewBox;
        const currentAspectRatio = width / height;

        if (Math.abs(aspectRatio - currentAspectRatio) > 0.1) {
          if (aspectRatio > currentAspectRatio) {
            // より横長にする
            const newWidth = height * aspectRatio;
            const deltaX = (newWidth - width) / 2;
            this.svg.setAttribute(
              'viewBox',
              `${x - deltaX} ${y} ${newWidth} ${height}`
            );
          } else {
            // より縦長にする
            const newHeight = width / aspectRatio;
            const deltaY = (newHeight - height) / 2;
            this.svg.setAttribute(
              'viewBox',
              `${x} ${y - deltaY} ${width} ${newHeight}`
            );
          }
        }
      }
    }
  }

  /**
   * パフォーマンス測定
   */
  measurePerformance(): {
    renderTime: number;
    elementCount: number;
    memoryUsage: number;
  } {
    const startTime = performance.now();
    const elementCount = this.svg.querySelectorAll('*').length;
    const endTime = performance.now();

    return {
      renderTime: endTime - startTime,
      elementCount,
      memoryUsage:
        (performance as unknown as { memory?: { usedJSHeapSize: number } })
          .memory?.usedJSHeapSize || 0,
    };
  }

  /**
   * クリーンアップ
   */
  clearCubes(): void {
    this.cubeGroups.forEach((group) => {
      group.remove();
    });
    this.cubeGroups.clear();
    this.viewBoxInitialized = false;
  }

  /**
   * SVGエクスポート（最適化版）
   */
  exportOptimizedSvg(): string {
    // 一時的にアニメーションを無効化
    const originalTransitions = new Map<Element, string>();
    this.svg.querySelectorAll('*').forEach((el) => {
      const element = el as HTMLElement;
      if (element.style.transition) {
        originalTransitions.set(el, element.style.transition);
        element.style.transition = 'none';
      }
    });

    const svgContent = this.svg.outerHTML;

    // アニメーションを復元
    originalTransitions.forEach((transition, el) => {
      (el as HTMLElement).style.transition = transition;
    });

    return svgContent;
  }

  /**
   * アクセシビリティ強化
   */
  enhanceAccessibility(): void {
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute(
      'aria-label',
      'Color palette visualization with 3D cube representation'
    );

    this.cubeGroups.forEach((group, id) => {
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', '0');
      group.setAttribute('aria-label', `Color cube ${id}`);

      // キーボードナビゲーション
      group.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          group.dispatchEvent(new Event('click', { bubbles: true }));
        }
      });
    });
  }
}
