import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getRoot(): { message: string } {
    return {
      message: 'Knowledge Hub API',
    };
  }
}
