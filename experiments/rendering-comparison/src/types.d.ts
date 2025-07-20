declare module 'shared-utilities' {
  export class PerformanceTracker {
    start(name: string): void;
    end(name: string): number;
    measurePerformance<T>(name: string, operation: () => T): T;
    measureAsyncPerformance<T>(
      name: string,
      operation: () => Promise<T>
    ): Promise<T>;
  }
}
