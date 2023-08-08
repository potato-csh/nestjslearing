import { Repository } from 'typeorm';

import { CustomRepository } from '@/modules/database/decorators/repository.decorator';

import { PostEntity } from '../entities/post.entity';

// 给PostEntity绑定为自定义Repository元数据 (CUSTOM_REPOSITORY_METADATA)
@CustomRepository(PostEntity)
export class PostRepository extends Repository<PostEntity> {
    buildBaseQB() {
        return this.createQueryBuilder('post');
    }
}
