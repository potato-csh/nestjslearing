import { BaseRepository } from '@/modules/database/base/repository';
import { CustomRepository } from '@/modules/database/decorators/repository.decorator';

import { CommentEntity } from '../entities';
import { PostEntity } from '../entities/post.entity';

// 给PostEntity绑定为自定义Repository元数据 (CUSTOM_REPOSITORY_METADATA)
@CustomRepository(PostEntity)
export class PostRepository extends BaseRepository<PostEntity> {
    protected _qbName: 'post';

    buildBaseQB() {
        return this.createQueryBuilder(this.qbName)
            .leftJoinAndSelect(`${this.qbName}.categories`, 'categories')
            .addSelect((subQuery) => {
                return subQuery
                    .select('(COUNT(c.id))', 'count')
                    .from(CommentEntity, 'c')
                    .where('c.post.id = post.id');
            }, 'commentCount')
            .loadRelationIdAndMap(`${this.qbName}.commentCount`, `${this.qbName}.comments`);
    }
}
