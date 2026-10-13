// Development environment. Mock backend is OFF — the UI now talks to the real
// Spring Boot API via proxy.conf.json (backend on :8090). Flip useMock back to
// true only to run the UI standalone without a backend.
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  useMock: false,
};
