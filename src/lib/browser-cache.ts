const purgedKeys = new Set<string>();
const purgedPrefixes = new Set<string>();

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function hasBrowserWindow() {
  return typeof window !== "undefined";
}

export function purgeLegacyCacheKeys(keys: string[]) {
  if (!canUseBrowserStorage()) return;

  keys.forEach((key) => {
    if (purgedKeys.has(key)) return;
    window.localStorage.removeItem(key);
    purgedKeys.add(key);
  });
}

export function purgeLegacyCacheByPrefixes(prefixes: string[]) {
  if (!canUseBrowserStorage()) return;

  const pendingPrefixes = prefixes.filter((prefix) => !purgedPrefixes.has(prefix));
  if (!pendingPrefixes.length) return;

  const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .filter((key): key is string => Boolean(key));

  keys.forEach((key) => {
    if (pendingPrefixes.some((prefix) => key.startsWith(prefix))) {
      window.localStorage.removeItem(key);
    }
  });

  pendingPrefixes.forEach((prefix) => purgedPrefixes.add(prefix));
}
