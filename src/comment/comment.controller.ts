import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Comments')
@Controller('comment')
export class CommentController {}
