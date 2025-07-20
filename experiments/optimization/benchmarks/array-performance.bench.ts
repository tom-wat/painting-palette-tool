import { bench, describe } from 'vitest';
import {
  processRegularArray,
  processTypedArray,
  processArrayUnrolled,
  processArrayVectorized,
  processArrayCacheFriendly,
  processArrayBlocked,
} from '../src/array-performance';

// テストデータを生成
function generateTestData(size: number): {
  regular: number[];
  typed: Float32Array;
} {
  const regular: number[] = [];
  const typed = new Float32Array(size);

  for (let i = 0; i < size; i++) {
    const value = Math.random() * 100;
    regular.push(value);
    typed[i] = value;
  }

  return { regular, typed };
}

describe('Array vs TypedArray Performance', () => {
  const sizes = [1000, 10000, 100000];

  sizes.forEach((size) => {
    describe(`Size: ${size}`, () => {
      const { regular, typed } = generateTestData(size);

      bench(`Regular Array - Sum (${size})`, () => {
        processRegularArray(regular, 'sum');
      });

      bench(`TypedArray - Sum (${size})`, () => {
        processTypedArray(typed, 'sum');
      });

      bench(`Regular Array - Multiply (${size})`, () => {
        processRegularArray(regular, 'multiply');
      });

      bench(`TypedArray - Multiply (${size})`, () => {
        processTypedArray(typed, 'multiply');
      });

      bench(`TypedArray - Unrolled (${size})`, () => {
        processArrayUnrolled(typed, 'multiply');
      });

      bench(`TypedArray - Vectorized (${size})`, () => {
        processArrayVectorized(typed, 'multiply');
      });
    });
  });
});

describe('Memory Access Patterns', () => {
  const width = 512;
  const height = 512;
  const data = new Float32Array(width * height);

  // テストデータを初期化
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 100;
  }

  bench('Cache Friendly - Horizontal', () => {
    processArrayCacheFriendly(data, width, height, 'horizontal');
  });

  bench('Cache Unfriendly - Vertical', () => {
    processArrayCacheFriendly(data, width, height, 'vertical');
  });

  bench('Blocked Processing - 32x32', () => {
    processArrayBlocked(data, width, height, 32);
  });

  bench('Blocked Processing - 64x64', () => {
    processArrayBlocked(data, width, height, 64);
  });

  bench('Blocked Processing - 128x128', () => {
    processArrayBlocked(data, width, height, 128);
  });
});

describe('Complex Operations', () => {
  const size = 50000;
  const { regular, typed } = generateTestData(size);

  bench('Regular Array - Transform', () => {
    processRegularArray(regular, 'transform');
  });

  bench('TypedArray - Transform', () => {
    processTypedArray(typed, 'transform');
  });
});
