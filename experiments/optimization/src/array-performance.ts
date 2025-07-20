// Array vs TypedArray性能比較

export function processRegularArray(
  data: number[],
  operation: 'sum' | 'multiply' | 'transform'
): number[] {
  switch (operation) {
    case 'sum':
      return [data.reduce((sum, val) => sum + val, 0)];
    case 'multiply':
      return data.map((val) => val * 2);
    case 'transform':
      return data.map((val) => Math.sqrt(val * val + 1));
    default:
      return data;
  }
}

export function processTypedArray(
  data: Float32Array,
  operation: 'sum' | 'multiply' | 'transform'
): Float32Array {
  switch (operation) {
    case 'sum': {
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      return new Float32Array([sum]);
    }
    case 'multiply': {
      const result = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        result[i] = data[i] * 2;
      }
      return result;
    }
    case 'transform': {
      const result = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        const val = data[i];
        result[i] = Math.sqrt(val * val + 1);
      }
      return result;
    }
    default:
      return data;
  }
}

// ループ展開の効果を検証
export function processArrayUnrolled(
  data: Float32Array,
  operation: 'sum' | 'multiply'
): Float32Array {
  switch (operation) {
    case 'sum': {
      let sum = 0;
      let i = 0;

      // 4要素ずつ処理（ループ展開）
      for (; i < data.length - 3; i += 4) {
        sum += data[i] + data[i + 1] + data[i + 2] + data[i + 3];
      }

      // 残りの要素を処理
      for (; i < data.length; i++) {
        sum += data[i];
      }

      return new Float32Array([sum]);
    }
    case 'multiply': {
      const result = new Float32Array(data.length);
      let i = 0;

      // 4要素ずつ処理
      for (; i < data.length - 3; i += 4) {
        result[i] = data[i] * 2;
        result[i + 1] = data[i + 1] * 2;
        result[i + 2] = data[i + 2] * 2;
        result[i + 3] = data[i + 3] * 2;
      }

      // 残りの要素を処理
      for (; i < data.length; i++) {
        result[i] = data[i] * 2;
      }

      return result;
    }
    default:
      return data;
  }
}

// SIMDライクな処理（手動ベクトル化）
export function processArrayVectorized(
  data: Float32Array,
  operation: 'multiply'
): Float32Array {
  if (operation !== 'multiply') return data;

  const result = new Float32Array(data.length);
  const vectorSize = 8; // 8要素ずつ処理
  let i = 0;

  // ベクトル化処理
  for (; i < data.length - (vectorSize - 1); i += vectorSize) {
    for (let j = 0; j < vectorSize; j++) {
      result[i + j] = data[i + j] * 2;
    }
  }

  // 残りの要素
  for (; i < data.length; i++) {
    result[i] = data[i] * 2;
  }

  return result;
}

// メモリアクセスパターンの最適化
export function processArrayCacheFriendly(
  data: Float32Array,
  width: number,
  height: number,
  operation: 'horizontal' | 'vertical'
): Float32Array {
  const result = new Float32Array(data.length);

  if (operation === 'horizontal') {
    // 行優先アクセス（キャッシュフレンドリー）
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        result[index] = data[index] * 2;
      }
    }
  } else {
    // 列優先アクセス（キャッシュに悪い）
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const index = y * width + x;
        result[index] = data[index] * 2;
      }
    }
  }

  return result;
}

// ブロック処理によるキャッシュ最適化
export function processArrayBlocked(
  data: Float32Array,
  width: number,
  height: number,
  blockSize: number = 64
): Float32Array {
  const result = new Float32Array(data.length);

  for (let blockY = 0; blockY < height; blockY += blockSize) {
    for (let blockX = 0; blockX < width; blockX += blockSize) {
      const endY = Math.min(blockY + blockSize, height);
      const endX = Math.min(blockX + blockSize, width);

      for (let y = blockY; y < endY; y++) {
        for (let x = blockX; x < endX; x++) {
          const index = y * width + x;
          result[index] = data[index] * 2;
        }
      }
    }
  }

  return result;
}
