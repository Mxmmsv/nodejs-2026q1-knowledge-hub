import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Articles')
@Controller('article')
export class ArticleController {}
