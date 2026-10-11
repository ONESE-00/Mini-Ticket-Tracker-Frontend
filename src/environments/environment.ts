// Production/default environment.
// `apiBaseUrl` is proxied to the backend in dev via proxy.conf.json.
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  useMock: false,
};
