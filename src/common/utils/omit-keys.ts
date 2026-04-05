export const omitKeys = <T extends Record<string, unknown>, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Omit<T, K> => {
  const nextValue = { ...value };

  for (const key of keys) {
    delete nextValue[key];
  }

  return nextValue;
};
