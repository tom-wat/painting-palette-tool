/**
 * Selection Tools Library
 * 矩形選択、ポリゴン選択の実装
 */

export interface Point {
  x: number;
  y: number;
}

export interface SelectionMask {
  width: number;
  height: number;
  data: Uint8Array; // 0 = not selected, 255 = selected
}


/**
 * ポリゴン選択ツール
 * クリック点を繋いで多角形の領域を選択
 */
export class PolygonSelection {
  private vertices: Point[] = [];
  private isComplete = false;

  /**
   * 頂点を追加
   */
  addVertex(point: Point): void {
    this.vertices.push(point);
  }

  /**
   * ポリゴンを完成
   */
  complete(): void {
    if (this.vertices.length >= 3) {
      this.isComplete = true;
    }
  }

  /**
   * ポリゴンをクリア
   */
  clear(): void {
    this.vertices = [];
    this.isComplete = false;
  }

  /**
   * 点がポリゴン内にあるかチェック（Ray Casting Algorithm）
   */
  isPointInside(point: Point): boolean {
    if (!this.isComplete || this.vertices.length < 3) return false;

    let inside = false;
    const { x, y } = point;

    for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
      const xi = this.vertices[i].x;
      const yi = this.vertices[i].y;
      const xj = this.vertices[j].x;
      const yj = this.vertices[j].y;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * 選択マスクを生成
   */
  generateMask(width: number, height: number): SelectionMask {
    const data = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        data[index] = this.isPointInside({ x, y }) ? 255 : 0;
      }
    }

    return { width, height, data };
  }

  /**
   * 頂点を取得
   */
  getVertices(): Point[] {
    return [...this.vertices];
  }

  /**
   * 選択が完了しているかチェック
   */
  getIsComplete(): boolean {
    return this.isComplete;
  }

  /**
   * 最初の点に近いかチェック（クローズ判定用）
   */
  isNearFirstVertex(point: Point, threshold: number = 10): boolean {
    if (this.vertices.length === 0) return false;
    
    const first = this.vertices[0];
    const distance = Math.sqrt(
      Math.pow(point.x - first.x, 2) + Math.pow(point.y - first.y, 2)
    );
    
    return distance <= threshold;
  }
}



/**
 * 選択マスクからImageDataを抽出
 */
export function extractImageDataFromMask(
  sourceImageData: ImageData,
  mask: SelectionMask
): ImageData | null {
  if (sourceImageData.width !== mask.width || sourceImageData.height !== mask.height) {
    return null;
  }

  // 選択されたピクセル数をカウント
  let selectedPixelCount = 0;
  for (let i = 0; i < mask.data.length; i++) {
    if (mask.data[i] > 0) {
      selectedPixelCount++;
    }
  }
  
  if (selectedPixelCount === 0) {
    return null;
  }


  // 選択されたピクセルのみを含むCompact ImageDataを作成
  const selectedPixels: { r: number; g: number; b: number; a: number }[] = [];
  const sourceData = sourceImageData.data;

  // 選択されたピクセルのみを収集
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      const maskIndex = y * mask.width + x;
      if (mask.data[maskIndex] > 0) {
        const dataIndex = maskIndex * 4;
        const alpha = sourceData[dataIndex + 3];
        
        // アルファ値が0でない（透明でない）ピクセルのみを追加
        if (alpha > 0) {
          selectedPixels.push({
            r: sourceData[dataIndex],
            g: sourceData[dataIndex + 1],
            b: sourceData[dataIndex + 2],
            a: alpha
          });
        }
      }
    }
  }

  if (selectedPixels.length === 0) {
    return null;
  }

  // 選択されたピクセルで新しいImageDataを作成（1行にレイアウト）
  const extractedData = new Uint8ClampedArray(selectedPixels.length * 4);
  
  for (let i = 0; i < selectedPixels.length; i++) {
    const pixel = selectedPixels[i];
    const targetIndex = i * 4;
    extractedData[targetIndex] = pixel.r;
    extractedData[targetIndex + 1] = pixel.g;
    extractedData[targetIndex + 2] = pixel.b;
    extractedData[targetIndex + 3] = pixel.a;
  }

  return new ImageData(extractedData, selectedPixels.length, 1);
}

/**
 * 選択マスクを可視化用Canvasに描画
 */
export function renderSelectionMask(
  canvas: HTMLCanvasElement,
  mask: SelectionMask,
  _color: string = 'rgba(0, 0, 255, 0.3)'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.createImageData(mask.width, mask.height);
  
  // マスクをCanvasImageDataに変換
  for (let i = 0; i < mask.data.length; i++) {
    const alpha = mask.data[i];
    const pixelIndex = i * 4;
    
    if (alpha > 0) {
      imageData.data[pixelIndex] = 0;     // R
      imageData.data[pixelIndex + 1] = 0; // G
      imageData.data[pixelIndex + 2] = 255; // B
      imageData.data[pixelIndex + 3] = Math.round(alpha * 0.3); // A
    } else {
      imageData.data[pixelIndex] = 0;
      imageData.data[pixelIndex + 1] = 0;
      imageData.data[pixelIndex + 2] = 0;
      imageData.data[pixelIndex + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}