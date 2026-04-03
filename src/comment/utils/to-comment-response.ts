import { CommentResponseDto } from '../dto';
import { Comment } from '../models/comment.model';

export const toCommentResponse = (comment: Comment): CommentResponseDto => ({
  id: comment.id,
  content: comment.content,
  articleId: comment.articleId,
  authorId: comment.authorId,
  createdAt: comment.createdAt,
});
