import { provideHttpClient, withFetch } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { client } from '@api/client.gen';
import { provideHeyApiClient } from '@api/client/client.gen';
import { environment } from '@env/environment';
import { routes } from './app.routes';

client.setConfig({ baseUrl: environment.apiBaseUrl });

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideHeyApiClient(client),
  ],
};
