// Test environment polyfills.
// jsdom does not implement matchMedia, which Angular CDK's BreakpointObserver
// and ngx-sonner rely on. Provide a minimal no-op implementation.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
