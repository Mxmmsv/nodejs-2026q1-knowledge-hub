import { BadRequestException, Injectable, ParseUUIDPipe } from '@nestjs/common';
import { AppErrorMessages } from '../errors/app-error-messages';

@Injectable()
export class UuidParamPipe extends ParseUUIDPipe {
  constructor() {
    super({
      version: '4',
      exceptionFactory: () => new BadRequestException(AppErrorMessages.INVALID_UUID),
    });
  }
}
