// Development environment. Mock backend is on by default so the UI
// runs end-to-end before the real API exists. Set useMock=false and run
// the backend on :8080 (proxy.conf.json) to hit the real server.
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  useMock: true,
};
