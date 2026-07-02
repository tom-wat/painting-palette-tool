import { describe, it, expect } from 'vitest';
import { PolygonSelection, extractImageDataFromMask, type SelectionMask } from './selection-tools';

describe('PolygonSelection', () => {
  it('is not complete until it has at least 3 vertices and complete() is called', () => {
    const polygon = new PolygonSelection();
    expect(polygon.getIsComplete()).toBe(false);

    polygon.addVertex({ x: 0, y: 0 });
    polygon.addVertex({ x: 10, y: 0 });
    polygon.complete();
    expect(polygon.getIsComplete()).toBe(false); // only 2 vertices

    polygon.addVertex({ x: 10, y: 10 });
    polygon.complete();
    expect(polygon.getIsComplete()).toBe(true);
  });

  it('reports points inside a triangle as inside, and points outside as outside', () => {
    const polygon = new PolygonSelection();
    polygon.addVertex({ x: 0, y: 0 });
    polygon.addVertex({ x: 10, y: 0 });
    polygon.addVertex({ x: 5, y: 10 });
    polygon.complete();

    expect(polygon.isPointInside({ x: 5, y: 3 })).toBe(true);
    expect(polygon.isPointInside({ x: 100, y: 100 })).toBe(false);
  });

  it('returns false from isPointInside when not complete', () => {
    const polygon = new PolygonSelection();
    polygon.addVertex({ x: 0, y: 0 });
    polygon.addVertex({ x: 10, y: 0 });
    polygon.addVertex({ x: 5, y: 10 });
    // complete() not called
    expect(polygon.isPointInside({ x: 5, y: 3 })).toBe(false);
  });

  it('clear() resets vertices and completion state', () => {
    const polygon = new PolygonSelection();
    polygon.addVertex({ x: 0, y: 0 });
    polygon.addVertex({ x: 10, y: 0 });
    polygon.addVertex({ x: 5, y: 10 });
    polygon.complete();
    polygon.clear();

    expect(polygon.getIsComplete()).toBe(false);
    expect(polygon.getVertices()).toHaveLength(0);
  });

  it('generateMask marks pixels inside the polygon as 255 and outside as 0', () => {
    const polygon = new PolygonSelection();
    polygon.addVertex({ x: 0, y: 0 });
    polygon.addVertex({ x: 4, y: 0 });
    polygon.addVertex({ x: 4, y: 4 });
    polygon.addVertex({ x: 0, y: 4 });
    polygon.complete();

    const mask = polygon.generateMask(6, 6);
    expect(mask.width).toBe(6);
    expect(mask.height).toBe(6);
    // (1,1) is inside the square, (5,5) is outside
    expect(mask.data[1 * 6 + 1]).toBe(255);
    expect(mask.data[5 * 6 + 5]).toBe(0);
  });

  it('isNearFirstVertex uses a distance threshold', () => {
    const polygon = new PolygonSelection();
    polygon.addVertex({ x: 0, y: 0 });
    expect(polygon.isNearFirstVertex({ x: 5, y: 0 }, 10)).toBe(true);
    expect(polygon.isNearFirstVertex({ x: 50, y: 0 }, 10)).toBe(false);
  });

  it('isNearFirstVertex returns false when there are no vertices', () => {
    const polygon = new PolygonSelection();
    expect(polygon.isNearFirstVertex({ x: 0, y: 0 })).toBe(false);
  });
});

describe('extractImageDataFromMask', () => {
  function makeImageData(width: number, height: number, fill: [number, number, number, number]): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = fill[0];
      data[i * 4 + 1] = fill[1];
      data[i * 4 + 2] = fill[2];
      data[i * 4 + 3] = fill[3];
    }
    return { width, height, data, colorSpace: 'srgb' } as ImageData;
  }

  it('returns null when source and mask dimensions differ', () => {
    const source = makeImageData(4, 4, [255, 0, 0, 255]);
    const mask: SelectionMask = { width: 2, height: 2, data: new Uint8Array(4) };
    expect(extractImageDataFromMask(source, mask)).toBeNull();
  });

  it('returns null when nothing is selected', () => {
    const source = makeImageData(2, 2, [255, 0, 0, 255]);
    const mask: SelectionMask = { width: 2, height: 2, data: new Uint8Array(4) }; // all zero
    expect(extractImageDataFromMask(source, mask)).toBeNull();
  });

  it('extracts only the selected, non-transparent pixels into a 1-row ImageData', () => {
    const source = makeImageData(2, 2, [10, 20, 30, 255]);
    const mask: SelectionMask = {
      width: 2,
      height: 2,
      data: new Uint8Array([255, 0, 255, 0]), // top-left and top-right selected
    };
    const result = extractImageDataFromMask(source, mask);
    expect(result).not.toBeNull();
    expect(result!.width).toBe(2);
    expect(result!.height).toBe(1);
    expect(Array.from(result!.data.slice(0, 4))).toEqual([10, 20, 30, 255]);
  });

  it('excludes fully transparent selected pixels', () => {
    const width = 1;
    const height = 1;
    const data = new Uint8ClampedArray([10, 20, 30, 0]); // alpha = 0
    const source = { width, height, data, colorSpace: 'srgb' } as ImageData;
    const mask: SelectionMask = { width, height, data: new Uint8Array([255]) };
    expect(extractImageDataFromMask(source, mask)).toBeNull();
  });
});
