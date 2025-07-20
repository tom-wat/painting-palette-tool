/**
 * Vitest テストセットアップ
 */

// DOM APIのモック
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    transform: 'none',
    transition: 'none',
  }),
});

// performance.now のモック
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: () => Date.now(),
    memory: {
      usedJSHeapSize: 1024 * 1024,
      totalJSHeapSize: 2 * 1024 * 1024,
      jsHeapSizeLimit: 4 * 1024 * 1024,
    },
  },
});

// requestAnimationFrame のモック
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16);
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// CustomEvent のポリフィル
if (typeof window !== 'undefined' && !window.CustomEvent) {
  function CustomEvent(event: string, params: any) {
    params = params || { bubbles: false, cancelable: false, detail: null };
    const evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(
      event,
      params.bubbles,
      params.cancelable,
      params.detail
    );
    return evt;
  }

  global.CustomEvent = CustomEvent as any;
}
