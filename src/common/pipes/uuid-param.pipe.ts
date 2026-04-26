import { Injectable, ParseUUIDPipe } from '@nestjs/common';
import { AppErrorMessages } from '../errors/app-error-messages';
import { ValidationError } from '../errors';

@Injectable()
export class UuidParamPipe extends ParseUUIDPipe {
  constructor() {
    super({
      version: '4',
      exceptionFactory: () => new ValidationError(AppErrorMessages.INVALID_UUID),
    });
  }
}
