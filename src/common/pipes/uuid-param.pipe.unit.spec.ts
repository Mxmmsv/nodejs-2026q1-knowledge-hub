import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AppErrorMessages } from '../errors/app-error-messages';
import { UuidParamPipe } from './uuid-param.pipe';

describe('UuidParamPipe', () => {
  it('passes valid v4 UUID values through', async () => {
    const pipe = new UuidParamPipe();
    const id = '11111111-1111-4111-8111-111111111111';

    await expect(pipe.transform(id, { type: 'param', metatype: String, data: 'id' })).resolves.toBe(id);
  });

  it('throws BadRequestException for malformed UUID values', async () => {
    const pipe = new UuidParamPipe();

    await expect(pipe.transform('not-a-uuid', { type: 'param', metatype: String, data: 'id' })).rejects.toThrow(
      new BadRequestException(AppErrorMessages.INVALID_UUID),
    );
  });
});
