import { ArgumentsHost, ExecutionContext } from '@nestjs/common';

export const createHttpExecutionContext = (
  request: Record<string, unknown> = {},
  response: Record<string, unknown> = {},
  handler: (...args: unknown[]) => unknown = () => undefined,
  classRef: new (...args: never[]) => unknown = class {},
): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => classRef,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  }) as unknown as ExecutionContext;

export const createArgumentsHost = (response: Record<string, unknown>): ArgumentsHost =>
  ({
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  }) as unknown as ArgumentsHost;
