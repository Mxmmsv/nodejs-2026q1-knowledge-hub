import { Injectable } from '@nestjs/common';
import { InMemoryCrudRepository } from '../../common/persistence/in-memory-crud.repository';
import { Comment } from '../models/comment.model';
import { CommentRepository } from './comment.repository';

@Injectable()
export class InMemoryCommentRepository extends InMemoryCrudRepository<Comment> implements CommentRepository {}
