import { Controller, Get } from '@nestjs/common';

import { PostService } from '../services/post.service';

@Controller('posts')
export class PostController {
    constructor(protected service: PostService) {}

    @Get()
    async list() {
        return this.service;
    }
}
