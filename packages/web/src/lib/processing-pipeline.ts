/**
 * Optimized processing pipeline for color extraction
 */

export interface ProcessingState {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
  canCancel: boolean;
}

export interface ProcessingOptions {
  enableCaching: boolean;
  maxMemoryUsage: number; // MB
  chunkSize: number;
  timeoutMs: number;
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  size: number; // bytes
}

class ProcessingPipeline {
  private abortController: AbortController | null = null;
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB
  private currentCacheSize = 0;

  /**
   * Start a new processing operation with cancellation support
   */
  startProcessing(): AbortController {
    // Cancel any existing operation
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = new AbortController();
    return this.abortController;
  }

  /**
   * Cancel current processing operation
   */
  cancelProcessing(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if operation should be cancelled
   */
  checkCancellation(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new Error('Operation cancelled');
    }
  }

  /**
   * Generate cache key for processing parameters
   */
  private generateCacheKey(imageData: ImageData, settings: any): string {
    const imageHash = this.hashImageData(imageData);
    const settingsHash = this.hashObject(settings);
    return `${imageHash}-${settingsHash}`;
  }

  /**
   * Simple hash function for ImageData
   */
  private hashImageData(imageData: ImageData): string {
    const { width, height } = imageData;
    // Sample a few pixels for hash to avoid processing entire image
    const samples = [];
    const step = Math.max(1, Math.floor(imageData.data.length / 400)); // ~100 pixels
    
    for (let i = 0; i < imageData.data.length; i += step) {
      samples.push(imageData.data[i]);
    }
    
    return `${width}x${height}-${samples.join(',')}`;
  }

  /**
   * Hash object for consistent cache keys
   */
  private hashObject(obj: any): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  /**
   * Get cached result if available
   */
  getCachedResult(imageData: ImageData, settings: any): any | null {
    const key = this.generateCacheKey(imageData, settings);
    const entry = this.cache.get(key);
    
    if (entry) {
      // Check if cache entry is still valid (5 minutes)
      const isValid = Date.now() - entry.timestamp < 5 * 60 * 1000;
      if (isValid) {
        return entry.data;
      } else {
        this.removeCacheEntry(key);
      }
    }
    
    return null;
  }

  /**
   * Store result in cache
   */
  setCachedResult(imageData: ImageData, settings: any, result: any): void {
    const key = this.generateCacheKey(imageData, settings);
    const serialized = JSON.stringify(result);
    const size = serialized.length * 2; // Rough byte estimate
    
    // Don't cache if result is too large
    if (size > 10 * 1024 * 1024) { // 10MB limit per entry
      return;
    }
    
    // Ensure cache doesn't exceed size limit
    this.ensureCacheSpace(size);
    
    const entry: CacheEntry = {
      key,
      data: result,
      timestamp: Date.now(),
      size,
    };
    
    this.cache.set(key, entry);
    this.currentCacheSize += size;
  }

  /**
   * Ensure cache has enough space for new entry
   */
  private ensureCacheSpace(requiredSize: number): void {
    // Remove oldest entries until we have enough space
    while (this.currentCacheSize + requiredSize > this.maxCacheSize && this.cache.size > 0) {
      const oldestKey = this.getOldestCacheKey();
      if (oldestKey) {
        this.removeCacheEntry(oldestKey);
      }
    }
  }

  /**
   * Get oldest cache entry key
   */
  private getOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });
    
    return oldestKey;
  }

  /**
   * Remove cache entry
   */
  private removeCacheEntry(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentCacheSize -= entry.size;
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; sizeBytes: number; hitRate?: number } {
    return {
      entries: this.cache.size,
      sizeBytes: this.currentCacheSize,
    };
  }

  /**
   * Process image data in chunks to reduce memory usage
   */
  async processImageInChunks<T>(
    imageData: ImageData,
    chunkSize: number,
    processor: (_chunk: ImageData, _signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal
  ): Promise<T[]> {
    const chunks = this.splitImageIntoChunks(imageData, chunkSize);
    const results: T[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      this.checkCancellation(signal);
      
      const result = await processor(chunks[i], signal);
      results.push(result);
      
      // Allow event loop to process other tasks
      await this.yieldToEventLoop();
    }
    
    return results;
  }

  /**
   * Split image into smaller chunks for processing
   */
  private splitImageIntoChunks(imageData: ImageData, maxChunkPixels: number): ImageData[] {
    const { width, height, data } = imageData;
    const totalPixels = width * height;
    
    if (totalPixels <= maxChunkPixels) {
      return [imageData];
    }
    
    const chunks: ImageData[] = [];
    const chunkHeight = Math.floor(maxChunkPixels / width);
    
    for (let y = 0; y < height; y += chunkHeight) {
      const actualHeight = Math.min(chunkHeight, height - y);
      const chunkData = new Uint8ClampedArray(width * actualHeight * 4);
      
      // Copy pixel data for this chunk
      const startIndex = y * width * 4;
      const endIndex = (y + actualHeight) * width * 4;
      chunkData.set(data.subarray(startIndex, endIndex));
      
      chunks.push(new ImageData(chunkData, width, actualHeight));
    }
    
    return chunks;
  }

  /**
   * Yield control to event loop
   */
  private yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Monitor memory usage
   */
  getMemoryUsage(): { used: number; limit: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
      };
    }
    return null;
  }

  /**
   * Check if memory usage is approaching limits
   */
  isMemoryPressure(): boolean {
    const memory = this.getMemoryUsage();
    if (!memory) return false;
    
    return memory.used / memory.limit > 0.8; // 80% threshold
  }

  /**
   * Force garbage collection if available (Chrome DevTools)
   */
  forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  /**
   * Debounced processing to avoid rapid successive operations
   */
  private debounceTimeouts = new Map<string, number>();

  debounce<T extends (..._args: any[]) => any>(
    key: string,
    fn: T,
    delay: number
  ): (..._args: Parameters<T>) => void {
    return (..._args: Parameters<T>) => {
      const existingTimeout = this.debounceTimeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const timeout = setTimeout(() => {
        fn(..._args);
        this.debounceTimeouts.delete(key);
      }, delay) as unknown as number;
      
      this.debounceTimeouts.set(key, timeout);
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.cancelProcessing();
    this.clearCache();
    
    // Clear all debounce timeouts
    this.debounceTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.debounceTimeouts.clear();
  }
}

// Singleton instance
export const processingPipeline = new ProcessingPipeline();

// Hook for React components
export function useProcessingPipeline() {
  return {
    startProcessing: () => processingPipeline.startProcessing(),
    cancelProcessing: () => processingPipeline.cancelProcessing(),
    getCachedResult: (imageData: ImageData, settings: any) => 
      processingPipeline.getCachedResult(imageData, settings),
    setCachedResult: (imageData: ImageData, settings: any, result: any) => 
      processingPipeline.setCachedResult(imageData, settings, result),
    getCacheStats: () => processingPipeline.getCacheStats(),
    clearCache: () => processingPipeline.clearCache(),
    getMemoryUsage: () => processingPipeline.getMemoryUsage(),
    isMemoryPressure: () => processingPipeline.isMemoryPressure(),
    debounce: <T extends (..._args: any[]) => any>(key: string, fn: T, delay: number) =>
      processingPipeline.debounce(key, fn, delay),
  };
}