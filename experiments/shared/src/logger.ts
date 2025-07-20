export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: any;
  category?: string;
}

export class Logger {
  private level: LogLevel = LogLevel.INFO;
  private entries: LogEntry[] = [];

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private log(
    level: LogLevel,
    message: string,
    data?: any,
    category?: string
  ): void {
    if (level < this.level) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      data,
      category,
    };

    this.entries.push(entry);

    if (
      process.env.NODE_ENV === 'development' ||
      process.env.TEST_VERBOSE === 'true'
    ) {
      const levelName = LogLevel[level];
      const categoryStr = category ? `[${category}]` : '';
      const dataStr = data ? JSON.stringify(data) : '';
      console.log(`[${levelName}]${categoryStr} ${message} ${dataStr}`);
    }
  }

  debug(message: string, data?: any, category?: string): void {
    this.log(LogLevel.DEBUG, message, data, category);
  }

  info(message: string, data?: any, category?: string): void {
    this.log(LogLevel.INFO, message, data, category);
  }

  warn(message: string, data?: any, category?: string): void {
    this.log(LogLevel.WARN, message, data, category);
  }

  error(message: string, data?: any, category?: string): void {
    this.log(LogLevel.ERROR, message, data, category);
  }

  // 特定用途のログメソッド
  perf(operation: string, duration: number, data?: any): void {
    this.info(`${operation}: ${duration.toFixed(3)}ms`, data, 'PERF');
  }

  colorExtraction(
    colors: number,
    duration: number,
    algorithm: string,
    imageSize?: [number, number]
  ): void {
    const data = { colors, algorithm, imageSize };
    this.info(
      `Extracted ${colors} colors in ${duration.toFixed(3)}ms using ${algorithm}`,
      data,
      'COLOR'
    );
  }

  rendering(fps: number, renderTime: number, renderer: string): void {
    const data = { fps, renderTime, renderer };
    this.info(
      `${renderer}: ${fps.toFixed(1)}fps, ${renderTime.toFixed(3)}ms render time`,
      data,
      'RENDER'
    );
  }

  memory(operation: string, used: number, peak: number): void {
    const data = {
      used: `${(used / 1024 / 1024).toFixed(2)}MB`,
      peak: `${(peak / 1024 / 1024).toFixed(2)}MB`,
    };
    this.info(`${operation} memory usage`, data, 'MEMORY');
  }

  getEntries(category?: string): LogEntry[] {
    if (!category) return [...this.entries];
    return this.entries.filter((entry) => entry.category === category);
  }

  clear(): void {
    this.entries = [];
  }

  export(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}

export const logger = new Logger();
