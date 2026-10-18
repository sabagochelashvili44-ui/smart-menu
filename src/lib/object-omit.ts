export function omitKeys<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> {
  const next = { ...obj };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}
