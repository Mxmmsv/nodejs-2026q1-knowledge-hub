export const appLogLevels = ['error', 'warn', 'log', 'debug', 'verbose'] as const;

export type AppLogLevel = (typeof appLogLevels)[number];
export type ExtendedLogLevel = AppLogLevel | 'fatal';

const logLevelPriority: Record<ExtendedLogLevel, number> = {
  fatal: 0,
  error: 0,
  warn: 1,
  log: 2,
  debug: 3,
  verbose: 4,
};

export const parseLogLevel = (value = process.env.LOG_LEVEL): AppLogLevel => {
  if (appLogLevels.includes(value as AppLogLevel)) {
    return value as AppLogLevel;
  }

  return 'log';
};

export const shouldLog = (configuredLevel: AppLogLevel, messageLevel: ExtendedLogLevel): boolean => {
  return logLevelPriority[messageLevel] <= logLevelPriority[configuredLevel];
};
