import { appConfig } from '@app/app.config';
import * as annotation from '@features/annotation/public-api';
import * as asset from '@features/asset/public-api';
import * as scene from '@features/scene/public-api';
import * as sdk from '@api/index';
import * as map from '@map/public-api';
import * as ui from '@shared/ui/public-api';
import { environment } from '@env/environment';

describe('path aliases', () => {
  it('resolves every alias from tsconfig paths', () => {
    expect(appConfig.providers.length).toBeGreaterThan(0);
    expect(environment.apiBaseUrl).toBe(''); // same origin, proxied in development
    for (const entry of [annotation, asset, scene, sdk, map, ui]) {
      expect(entry).toBeDefined();
    }
  });
});
