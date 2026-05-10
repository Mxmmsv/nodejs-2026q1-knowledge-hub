const redactedValue = '[REDACTED]';
const sensitiveKeys = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'geminiapikey',
  'gemini_api_key',
  'x-goog-api-key',
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

const isSensitiveKey = (key: string): boolean => sensitiveKeys.has(key.toLowerCase());

export const sanitizeLogData = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);
    return value.map((item) => sanitizeLogData(item, seen));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? redactedValue : sanitizeLogData(item, seen),
    ]),
  );
};
