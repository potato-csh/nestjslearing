import { Injectable } from '@nestjs/common';

import { PostRepository } from '../repositories/post.repository';

@Injectable()
export class PostService {
    constructor(protected reponsitory: PostRepository) {}
}
