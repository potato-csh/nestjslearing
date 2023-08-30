import { Injectable } from '@nestjs/common';
import { isArray } from 'class-validator';
import { isFunction, isNil, omit } from 'lodash';

import { EntityNotFoundError, In, IsNull, Not, SelectQueryBuilder } from 'typeorm';

import { SelectTrashMode } from '@/modules/database/constants';
import { paginate } from '@/modules/database/helpers';
import { QueryHook } from '@/modules/database/types';

import { PostOrderType } from '../constants';
import { CreatPostDto, QueryPostDto } from '../dtos/post.dto';
import { CategoryEntity, PostEntity } from '../entities';
import { CategoryRepository } from '../repositories';
import { PostRepository } from '../repositories/post.repository';

import { CategoryService } from './category.service';

@Injectable()
export class PostService {
    constructor(
        protected repository: PostRepository,
        protected categoryRepository: CategoryRepository,
        protected categoryService: CategoryService,
    ) {}

    /**
     * 获取分页数据
     * @param options 分页选项
     * @param callback 添加额外的查询
     */
    async paginate(options: QueryPostDto, callback?: QueryHook<PostEntity>) {
        const qb = await this.buildListQuery(this.repository.buildBaseQB(), options, callback);
        return paginate(qb, options);
    }

    /**
     * 查询单篇文章
     * @param id
     * @param callback 添加额外的查询
     */
    async detail(id: string, callback?: QueryHook<PostEntity>) {
        let qb = this.repository.buildBaseQB();
        qb.where(`post.id = :id`, { id });
        qb = !isNil(callback) && isFunction(callback) ? await callback(qb) : qb;
        const item = await qb.getOne();
        if (!item) throw new EntityNotFoundError(PostEntity, `The post ${id} not exists!`);
        return item;
    }

    /**
     * 创建文章
     * @param data
     */
    async create(data: CreatPostDto) {
        const createPostDto = {
            ...data,
            // 文章所属分类
            categories: (isArray(data.categories)
                ? await this.categoryRepository.findBy({
                      id: In(data.categories),
                  })
                : []) as unknown as CategoryEntity,
        };
        const item = await this.repository.save(createPostDto);
        return this.detail(item.id);
    }

    /**
     * 更新文章
     * @param data
     */
    async update(data: Record<string, any>) {
        const post = await this.detail(data.id);
        if (isArray(data.categories)) {
            // 更新文章所属分类
            await this.repository
                .createQueryBuilder('post')
                .relation(PostEntity, 'categories')
                .of(post)
                .addAndRemove(data.categories, post.categories ?? []);
        }
        await this.repository.update(data.id, omit(data, ['id', 'categories']));
        return this.detail(data.id);
    }

    /**
     * 删除文章
     * @param id
     */
    async delete(ids: string[], trashed?: boolean) {
        const items = await this.repository.find({
            where: { id: In(ids) },
            withDeleted: true,
        });
        if (trashed) {
            // 对已软删除的数据再次删除时直接通过remove方法从数据库中清除
            const directs = items.filter((item) => !isNil(item.deletedAt));
            const softs = items.filter((item) => isNil(item.deletedAt));
            return [
                ...(await this.repository.remove(directs)),
                ...(await this.repository.softRemove(softs)),
            ];
        }
        return this.repository.remove(items);
    }

    /**
     * 恢复文章
     * 恢复软删除的文章
     */
    async restore(ids: string[]) {
        const items = await this.repository.find({
            where: { id: In(ids) },
            withDeleted: true,
        });
        // 过滤掉不在回收站中的数据
        const trasheds = items.filter((item) => !isNil(item)).map((item) => item.id);
        if (trasheds.length < 0) return [];
        await this.repository.restore(trasheds);
        const qb = await this.buildListQuery(this.repository.buildBaseQB(), {}, async (qbuilder) =>
            qbuilder.andWhereInIds(trasheds),
        );
        return qb.getMany();
    }

    /**
     * 构建文章列表查询器
     * @param qb 初始查询构造器
     * @param options 排查分页选项后的查询选项
     * @param callback 添加额外的查询
     */
    protected async buildListQuery(
        qb: SelectQueryBuilder<PostEntity>,
        options: Record<string, any>,
        callback?: QueryHook<PostEntity>,
    ) {
        const { category, orderBy, isPublished, trashed = SelectTrashMode.NONE } = options;
        let newQb = qb;
        // 是否查询回收站
        if (trashed === SelectTrashMode.ALL || trashed === SelectTrashMode.ONLY) {
            newQb.withDeleted();
            if (trashed === SelectTrashMode.ONLY) newQb.where(`post.deletedAt is not null`);
        }
        if (typeof isPublished === 'boolean') {
            newQb = isPublished
                ? newQb.where({
                      publishedAt: Not(IsNull()),
                  })
                : newQb.where({
                      publishedAt: IsNull(),
                  });
        }
        newQb = this.queryOrderBy(newQb, orderBy);
        if (category) {
            newQb = await this.queryByCategory(category, newQb);
        }
        if (callback) return callback(newQb);
        return newQb;
    }

    /**
     *  对文章进行排序的Query构建
     * @param qb
     * @param orderBy 排序方式
     */
    protected queryOrderBy(qb: SelectQueryBuilder<PostEntity>, orderBy?: PostOrderType) {
        switch (orderBy) {
            case PostOrderType.CREATED:
                return qb.orderBy('post.createdAt', 'DESC');
            case PostOrderType.UPDATED:
                return qb.orderBy('post.updatedAt', 'DESC');
            case PostOrderType.PUBLISHED:
                return qb.orderBy('post.publishedAt', 'DESC');
            case PostOrderType.CUSTOM:
                return qb.orderBy('customOrder', 'DESC');
            default:
                return qb
                    .orderBy('post.createdAt', 'DESC')
                    .addOrderBy('post.updatedAt', 'DESC')
                    .addOrderBy('post.publishedAt', 'DESC');
        }
    }

    /**
     * 查询出分类及其后代分类下的所有文章的Query构建
     * @param id
     * @param qb
     */
    protected async queryByCategory(id: string, qb: SelectQueryBuilder<PostEntity>) {
        const root = await this.categoryService.detail(id);
        const tree = await this.categoryRepository.findDescendantsTree(root);
        const flatDes = await this.categoryRepository.toFlatTrees(tree.children);
        const ids = [tree.id, ...flatDes.map((item) => item.id)];
        return qb.where('categories.id IN (:...ids)', {
            ids,
        });
    }
}
