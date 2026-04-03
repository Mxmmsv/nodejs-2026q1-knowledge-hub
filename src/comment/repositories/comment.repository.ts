import { CrudRepository } from '../../common/persistence/crud.repository';
import { Comment } from '../models/comment.model';

export abstract class CommentRepository extends CrudRepository<Comment> {}
