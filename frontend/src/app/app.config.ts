import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from '@interceptors/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Here we are applying my interceptor to all HTTP requests.
    // This is a good place to add interceptors that should be applied to all requests.
    provideHttpClient(withInterceptors([tokenInterceptor])),
  ],
};
