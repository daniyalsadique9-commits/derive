type SingletonStore = typeof globalThis & { __singletons?: Map<string, unknown> };

/**
 * Returns one shared instance per server process. Survives hot reloads in development,
 * so in-memory state like quota counters isn't reset on every file save.
 */
export function singleton<T>(name: string, create: () => T): T {
  const store = globalThis as SingletonStore;
  store.__singletons ??= new Map();
  if (!store.__singletons.has(name)) {
    store.__singletons.set(name, create());
  }
  return store.__singletons.get(name) as T;
}
