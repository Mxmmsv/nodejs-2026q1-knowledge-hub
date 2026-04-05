import { Injectable } from '@nestjs/common';
import { InMemoryCrudRepository } from '../../common/persistence/in-memory-crud.repository';
import { Category } from '../models/category.model';
import { CategoryRepository } from './category.repository';

@Injectable()
export class InMemoryCategoryRepository extends InMemoryCrudRepository<Category> implements CategoryRepository {}
