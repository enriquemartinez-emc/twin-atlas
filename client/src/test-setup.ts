// jsdom lacks two browser features the select's overlay relies on.
const noop = (): void => undefined;

globalThis.ResizeObserver ??= class {
  observe = noop;
  unobserve = noop;
  disconnect = noop;
};
Element.prototype.scrollIntoView ??= noop;
