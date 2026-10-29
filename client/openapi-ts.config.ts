import { defineConfig } from '@hey-api/openapi-ts';

// The SDK is generated from the contract the server commits (docs/openapi.json).
// Never edit src/app/api by hand: change the server, regenerate the spec, run `npm run api:generate`.
export default defineConfig({
  input: '../docs/openapi.json',
  output: { path: 'src/app/api', clean: true },
  plugins: [
    '@hey-api/typescript',
    '@hey-api/client-angular',
    { name: '@hey-api/sdk', operations: { strategy: 'flat' } },
    '@angular/common',
  ],
});
