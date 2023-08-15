import { Exclude, Expose, Type } from 'class-transformer';
import {
    BaseEntity,
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToMany,
    Tree,
    TreeParent,
    TreeChildren,
    Relation,
} from 'typeorm';

import { PostEntity } from './post.entity';

@Exclude()
@Tree('materialized-path')
@Entity('content_comments')
export class CommentEntity extends BaseEntity {
    @Expose()
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Expose()
    @Column({ comment: '评论内容', type: 'longtext' })
    body: string;

    @Expose()
    @Type(() => Date)
    @CreateDateColumn({ comment: '创建时间' })
    createdAt: Date;

    @Expose()
    @Type(() => PostEntity)
    @ManyToMany((type) => PostEntity, (post) => post.categories)
    post: Relation<PostEntity>;

    @Expose()
    depth = 0;

    @Type(() => CommentEntity)
    @TreeParent({ onDelete: `CASCADE` })
    parent: Relation<CommentEntity> | null;

    @Expose()
    @Type(() => CommentEntity)
    @TreeChildren({ cascade: true })
    children: Relation<CommentEntity>[];
}
