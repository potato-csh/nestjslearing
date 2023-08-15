import { Exclude, Expose } from 'class-transformer';
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    PrimaryGeneratedColumn,
    Relation,
    UpdateDateColumn,
} from 'typeorm';

import { PostBodyType } from '../constants';

import { CategoryEntity } from './category.entity';
import { CommentEntity } from './comment.entity';

@Exclude()
@Entity('content_posts')
export class PostEntity extends BaseEntity {
    @Expose()
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Expose()
    @Column({ comment: '文章标题' })
    title: string;

    @Expose({ groups: ['post-detail'] })
    @Column({ comment: '文章内容', type: 'longtext' })
    body: string;

    @Expose()
    @Column({ comment: '文章描述', nullable: true })
    summary?: string;

    @Expose()
    @Column({ comment: '关键字', type: 'simple-array', nullable: true })
    keyword?: string;

    @Expose()
    @Column({ comment: '发布时间', type: 'enum', enum: PostBodyType, default: PostBodyType.MD })
    type: PostBodyType;

    @Expose()
    @Column({ comment: '发布时间', type: 'varchar', nullable: true })
    publishedAt?: Date | null;

    @Expose()
    @Column({ comment: '文章排序', default: 0 })
    customOrder: number;

    @Expose()
    @CreateDateColumn({ comment: '创建时间' })
    createdAt: Date;

    @Expose()
    @UpdateDateColumn({ comment: '更新时间' })
    updatedAt: Date;

    @ManyToMany((type) => CategoryEntity, (category) => category.posts, {
        // 在新增文章时,如果所属分类不存在则直接创建
        cascade: true,
    })
    @JoinTable()
    categories: Relation<CategoryEntity>;

    // 删除文章也会删除评论
    @ManyToOne((type) => CommentEntity, (comment) => comment.post, {
        cascade: true,
    })
    @JoinColumn()
    comments: Relation<CommentEntity>;

    @Expose()
    commentCount: number;
}
