import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { mockApiInterceptor } from './core/mock/mock-api.interceptor';
import { provideZard } from '@/shared/core/provider/providezard';

// The mock interceptor only intercepts when environment.useMock is true;
// it still sits in the chain harmlessly when hitting the real API.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors(environment.useMock ? [mockApiInterceptor] : [])),
    provideZard(),
  ],
};
