import { CategoryResponseDto } from '../dto';
import { Category } from '../models/category.model';

export const toCategoryResponse = (category: Category): CategoryResponseDto => ({
  id: category.id,
  name: category.name,
  description: category.description,
});
