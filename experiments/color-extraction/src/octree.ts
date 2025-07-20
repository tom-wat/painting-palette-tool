import type { RGB, ColorData } from './types.js';
import { createColorData } from './utils.js';

class OctreeNode {
  children: (OctreeNode | null)[] = new Array(8).fill(null);
  pixelCount = 0;
  redSum = 0;
  greenSum = 0;
  blueSum = 0;
  isLeaf = false;
  level: number;

  constructor(level: number) {
    this.level = level;
  }

  get averageColor(): RGB {
    if (this.pixelCount === 0) return { r: 0, g: 0, b: 0 };

    return {
      r: Math.round(this.redSum / this.pixelCount),
      g: Math.round(this.greenSum / this.pixelCount),
      b: Math.round(this.blueSum / this.pixelCount),
    };
  }
}

export class OctreeExtractor {
  private maxColors: number;
  private leafNodes: OctreeNode[] = [];

  constructor(maxColors: number) {
    this.maxColors = maxColors;
  }

  extract(imageData: ImageData): ColorData[] {
    this.leafNodes = [];
    const root = new OctreeNode(0);

    // ピクセルデータをオクトリーに追加
    this.addPixelsToOctree(imageData, root);

    // リーフノードを指定数まで削減
    this.reduceTree();

    // 結果の色を生成
    return this.leafNodes
      .filter((node) => node.pixelCount > 0)
      .map((node) => createColorData(node.averageColor));
  }

  private addPixelsToOctree(imageData: ImageData, root: OctreeNode): void {
    const { data } = imageData;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];

      // 透明度が低いピクセルはスキップ
      if (alpha < 128) continue;

      this.addPixel(root, r, g, b, 0);
    }
  }

  private addPixel(
    node: OctreeNode,
    r: number,
    g: number,
    b: number,
    level: number
  ): void {
    node.pixelCount++;
    node.redSum += r;
    node.greenSum += g;
    node.blueSum += b;

    if (level === 7) {
      // 最下位レベルなのでリーフノードとして登録
      if (!node.isLeaf) {
        node.isLeaf = true;
        this.leafNodes.push(node);
      }
      return;
    }

    // オクトリーインデックスを計算
    const index = this.getOctreeIndex(r, g, b, level);

    if (!node.children[index]) {
      node.children[index] = new OctreeNode(level + 1);
    }

    this.addPixel(node.children[index]!, r, g, b, level + 1);
  }

  private getOctreeIndex(
    r: number,
    g: number,
    b: number,
    level: number
  ): number {
    const shift = 7 - level;
    const rBit = (r >> shift) & 1;
    const gBit = (g >> shift) & 1;
    const bBit = (b >> shift) & 1;

    return (rBit << 2) | (gBit << 1) | bBit;
  }

  private reduceTree(): void {
    while (this.leafNodes.length > this.maxColors) {
      // 最もピクセル数が少ないリーフノードを削除
      const minIndex = this.leafNodes.reduce(
        (minIdx, node, idx, arr) =>
          node.pixelCount < arr[minIdx].pixelCount ? idx : minIdx,
        0
      );

      this.leafNodes.splice(minIndex, 1);
    }
  }
}
