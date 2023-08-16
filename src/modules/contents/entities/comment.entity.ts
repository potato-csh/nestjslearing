import { Expose, Type } from 'class-transformer';
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    Relation,
    Tree,
    TreeChildren,
    TreeParent,
} from 'typeorm';

import { PostEntity } from './post.entity';

@Tree('materialized-path')
@Entity('content_comments')
export class CommentEntity extends BaseEntity {
    @Expose()
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Expose()
    @Column({ comment: '评论内容', type: 'text' })
    body: string;

    @Expose()
    @Type(() => Date)
    @CreateDateColumn({ comment: '创建时间' })
    createdAt: Date;

    @Expose()
    @Type(() => PostEntity)
    @ManyToOne((type) => PostEntity, (post) => post.comments, {
        nullable: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    post: Relation<PostEntity>;

    @TreeParent({ onDelete: 'CASCADE' })
    parent: Relation<CommentEntity> | null;

    @Expose()
    @TreeChildren({ cascade: true })
    children: Relation<CommentEntity>[];

    @Expose()
    depth = 0;
}
