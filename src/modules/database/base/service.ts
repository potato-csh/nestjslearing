/* eslint-disable consistent-return */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { isNil } from 'lodash';
import { In, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import { SelectTrashMode, TreeChildrenResolve } from '../constants';
import { paginate, treePaginate } from '../helpers';
import { PaginateOptions, PaginateReturn, QueryHook, ServiceListQueryOption } from '../types';

import { BaseRepository } from './repository';
import { BaseTreeRepository } from './tree.repository';

/**
 * CURD操作服务
 */
export abstract class BaseService<
    E extends ObjectLiteral,
    R extends BaseRepository<E> | BaseTreeRepository<E>,
    P extends ServiceListQueryOption<E> = ServiceListQueryOption<E>,
> {
    /**
     * 服务默认存储类
     */
    protected repository: R;

    /**
     * 是否改期软删除功能
     */
    protected enableTrash = false;

    constructor(repository: R) {
        this.repository = repository;
        if (
            !(
                this.repository instanceof BaseRepository ||
                this.repository instanceof BaseTreeRepository
            )
        ) {
            throw new Error(
                'Repository must instance of BaseRepository or BaseTreeRepository in DataService',
            );
        }
    }

    /**
     * 获取查询数据列表的QueryBuildQuery
     * @param qb querybuilder实例
     * @param option 查询选型
     * @param Callback 查询回调
     */
    protected async buildListQB(qb: SelectQueryBuilder<E>, option?: P, callback?: QueryHook<E>) {
        const { trashed } = option ?? {};
        const queryName = this.repository.qbName;
        // 是否查询回收站
        if (
            this.enableTrash &&
            (trashed === SelectTrashMode.ALL || trashed === SelectTrashMode.ONLY)
        ) {
            qb.withDeleted();
            if (trashed === SelectTrashMode.ONLY) {
                qb.where(`${queryName}.deleteAt IS NOT NULL`);
            }
        }
        if (callback) return callback(qb);
        return qb;
    }

    /**
     * 获取查询单个项目的querybuilder
     */
    protected async buildItemQB(id: string, qb: SelectQueryBuilder<E>, callback?: QueryHook<E>) {
        qb.where(`${this.repository.qbName}.id = :id`, { id });
        if (callback) return callback(qb);
        return qb;
    }

    /**
     * 获取数据列表
     * @param options 查询参数
     * @param callback 回调参数
     */
    async list(options?: P, callback?: QueryHook<E>): Promise<E[]> {
        const { trashed: isTrashed = false } = options ?? {};
        const trashed = isTrashed || SelectTrashMode.NONE;
        if (this.repository instanceof BaseTreeRepository) {
            const withTrashed =
                this.enableTrash &&
                (trashed === SelectTrashMode.ALL || trashed === SelectTrashMode.ONLY);
            const onlyTrashed = this.enableTrash && trashed === SelectTrashMode.ONLY;
            const tree = await this.repository.findTrees({ ...options, withTrashed, onlyTrashed });
            return this.repository.toFlatTrees(tree);
        }
    }

    /**
     * 获取分页数据
     * @param options
     * @param callback
     */
    async paginate(
        options?: PaginateOptions & P,
        callback?: QueryHook<E>,
    ): Promise<PaginateReturn<E>> {
        const queryOptions = (options ?? {}) as P;
        if (this.repository instanceof BaseTreeRepository) {
            const data = await this.list(queryOptions, callback);
            return treePaginate(options, data) as PaginateReturn<E>;
        }
        const qb = await this.buildListQB(this.repository.buildBaseQB(), queryOptions, callback);
        return paginate(qb, options);
    }

    /**
     * 获取数据详情
     * @param id
     * @param callback
     */
    async detail(id: string, callback?: QueryHook<E>): Promise<E> {
        const qb = this.buildItemQB(id, this.repository.buildBaseQB(), callback);
        const item = (await qb).getOne();
        if (!item) throw new NotFoundException(`${this.repository.qbName} ${id} not exists!`);
        return item;
    }

    /**
     * 创建数据,如果子类没有实现则抛出404
     * @param data
     * @param other
     */
    create(data: any, ...other: any[]): Promise<E> {
        throw new ForbiddenException(`Can not to create ${this.repository.qbName}!`);
    }

    update(data: any, ...other: any[]): Promise<E> {
        throw new ForbiddenException(`Can not to update ${this.repository.qbName}!`);
    }

    /**
     * 批量删除数据
     * @param ids
     * @param trash
     */
    async delete(ids: string[], trash?: boolean) {
        let items: E[] = [];
        if (this.repository instanceof BaseTreeRepository) {
            items = await this.repository.find({
                where: { id: In(ids) } as any,
                withDeleted: this.enableTrash ? true : undefined,
                relations: ['parent', 'children'],
            });
            if (this.repository.childrenResolve === TreeChildrenResolve.UP) {
                for (const item of items) {
                    if (isNil(item.children) || item.children.length <= 0) continue;
                    const nchildren = [...item.children].map((c) => {
                        c.parent = item.parent;
                        return item;
                    });
                    await this.repository.save(nchildren);
                }
            }
        } else {
            items = await this.repository.find({
                where: { id: In(ids) } as any,
                withDeleted: this.enableTrash ? true : undefined,
            });
        }
        if (this.enableTrash && trash) {
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
     * 批量恢复回收站中的数据
     * @param ids
     */
    async restore(ids: string[]) {
        if (!this.enableTrash) {
            throw new ForbiddenException(
                `Can not to retore ${this.repository.qbName}, becaues trash not enabled!`,
            );
        }
        const items = await this.repository.find({
            where: { id: In(ids) } as any,
            withDeleted: true,
        });
        const trasheds = items.filter((item) => !isNil(item));
        if (trasheds.length < 0) return [];
        await this.repository.restore(trasheds.map((item) => item.id));
        const qb = await this.buildListQB(
            this.repository.buildBaseQB(),
            undefined,
            async (qbuilder) => qbuilder.andWhereInIds(trasheds),
        );
        return qb.getMany();
    }
}
