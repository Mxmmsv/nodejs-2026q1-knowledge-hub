import { Injectable } from '@nestjs/common';
import { InMemoryCrudRepository } from '../../common/persistence/in-memory-crud.repository';
import { User } from '../models/user.model';
import { UserRepository } from './user.repository';

@Injectable()
export class InMemoryUserRepository extends InMemoryCrudRepository<User> implements UserRepository {}
