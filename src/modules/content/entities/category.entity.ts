import { Exclude, Expose, Type } from 'class-transformer';
import {
    Column,
    DeleteDateColumn,
    Entity,
    ManyToMany,
    Index,
    Relation,
    Tree,
    TreeChildren,
    TreeParent,
} from 'typeorm';

import { BaseEntity } from '@/modules/database/base/entity';

import { PostEntity } from './post.entity';

@Exclude()
@Tree('materialized-path')
@Entity('content_categories')
export class CategoryEntity extends BaseEntity {
    @Expose()
    @Column({ comment: '分类名称' })
    @Index({ fulltext: true })
    name: string;

    @Expose({ groups: ['category-tree', 'category-list', 'category-detail'] })
    @Column({ comment: '分类排序', default: 0 })
    customOrder: number;

    // @ManyToMany((type) => PostEntity, (post) => post.categories, {
    //     nullable: false,
    //     onDelete: 'CASCADE',
    //     onUpdate: 'CASCADE',
    // })
    // posts: Relation<PostEntity>;

    @ManyToMany((type) => PostEntity, (post) => post.categories)
    posts: PostEntity[];

    @Expose()
    @DeleteDateColumn({
        comment: '删除时间',
    })
    deletedAt: Date;

    @Expose({ groups: ['category-list'] })
    depth = 0;

    @Expose({ groups: ['category-list', 'category-detail'] })
    @Type(() => CategoryEntity)
    @TreeParent({ onDelete: `NO ACTION` })
    parent: Relation<CategoryEntity> | null;

    @Expose({ groups: ['category-tree'] })
    @Type(() => CategoryEntity)
    @TreeChildren({ cascade: true })
    children: Relation<CategoryEntity>[];
}
