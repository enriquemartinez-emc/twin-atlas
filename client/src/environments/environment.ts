export const environment = {
  /** Same origin: the dev server proxies /api to the backend (proxy.conf.json). */
  apiBaseUrl: '',
  /** Where the camera starts (Sagrada Família, Barcelona: covered by Google Photorealistic 3D Tiles). */
  defaultView: { longitude: 2.1744, latitude: 41.4036, height: 700 },
} as const;
