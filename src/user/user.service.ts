import { Inject, Injectable } from '@nestjs/common';
import { User } from './models/user.model';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    @Inject(UserRepository)
    private readonly userRepository: UserRepository,
  ) {}

  findAll(): User[] {
    return this.userRepository.findAll();
  }

  findById(id: string): User | undefined {
    return this.userRepository.findById(id);
  }

  save(user: User): User {
    return this.userRepository.save(user);
  }

  remove(id: string): boolean {
    return this.userRepository.remove(id);
  }
}
