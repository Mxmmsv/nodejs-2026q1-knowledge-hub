import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Categories')
@Controller('category')
export class CategoryController {}
