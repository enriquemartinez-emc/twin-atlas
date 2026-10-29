import { appConfig } from '@app/app.config';
import * as annotation from '@features/annotation';
import * as scene from '@features/scene';
import * as sdk from '@api/index';
import * as map from '@map';
import * as button from '@shared/ui/button';
import { environment } from '@env/environment';

describe('path aliases', () => {
  it('resolves every alias from tsconfig paths', () => {
    expect(appConfig.providers.length).toBeGreaterThan(0);
    expect(environment.apiBaseUrl).toBe(''); // same origin, proxied in development
    for (const entry of [annotation, scene, sdk, map, button]) {
      expect(entry).toBeDefined();
    }
  });
});
