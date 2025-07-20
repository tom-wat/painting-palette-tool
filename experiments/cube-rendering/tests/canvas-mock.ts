/**
 * Canvas 2D モックの実装（テスト用）
 */

interface PathCommand {
  type: 'move' | 'line' | 'close';
  x?: number;
  y?: number;
}

// Canvas 2D コンテキストの基本的なモック実装
export class MockCanvasRenderingContext2D
  implements Partial<CanvasRenderingContext2D>
{
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  lineWidth: number = 1;

  private path: PathCommand[] = [];

  clearRect(x: number, y: number, w: number, h: number): void {
    // モック実装：何もしない
  }

  beginPath(): void {
    this.path = [];
  }

  moveTo(x: number, y: number): void {
    this.path.push({ type: 'move', x, y });
  }

  lineTo(x: number, y: number): void {
    this.path.push({ type: 'line', x, y });
  }

  closePath(): void {
    this.path.push({ type: 'close' });
  }

  fill(): void {
    // モック実装：何もしない
  }

  stroke(): void {
    // モック実装：何もしない
  }
}

// HTMLCanvasElement の基本的なモック実装
export class MockHTMLCanvasElement {
  width: number = 800;
  height: number = 600;

  private context: MockCanvasRenderingContext2D | null = null;

  getContext(contextType: '2d'): MockCanvasRenderingContext2D | null;
  getContext(contextType: string): unknown {
    if (contextType === '2d') {
      if (!this.context) {
        this.context = new MockCanvasRenderingContext2D();
      }
      return this.context;
    }
    return null;
  }

  addEventListener(_type: string, _listener: EventListener): void {
    // モック実装：何もしない
  }

  getBoundingClientRect(): DOMRect {
    return {
      left: 0,
      top: 0,
      right: this.width,
      bottom: this.height,
      width: this.width,
      height: this.height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  }
}
