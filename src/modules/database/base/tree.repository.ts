import { isNil, pick, unset } from 'lodash';
import {
    FindOptionsUtils,
    FindTreeOptions,
    ObjectLiteral,
    SelectQueryBuilder,
    TreeRepository,
    TreeRepositoryUtils,
} from 'typeorm';

import { OrderType, TreeChildrenResolve } from '../constants';
import { OrderQueryType, getOrderByQuery, QueryParams } from '../types';

export class BaseTreeRepository<E extends ObjectLiteral> extends TreeRepository<E> {
    /**
     * 查询器名称
     */
    protected _qbName = 'treeEntity';

    /**
     * 默认排序规则，可以通过每个方法的orderBy选项进行覆盖
     */
    protected orderBy?: string | { name: string; order: `${OrderType}` };

    /**
     * 删除父分类后是否提升子分类的等级
     */
    protected _childrenResolve?: TreeChildrenResolve;

    /**
     * 返回查询器的名称
     */
    get qbName() {
        return this._qbName;
    }

    get childrenResolve() {
        return this._childrenResolve;
    }

    /**
     * 构建基础查询器
     */
    buildBaseQB(qb?: SelectQueryBuilder<E>): SelectQueryBuilder<E> {
        const queryBuilder = qb ?? this.createQueryBuilder(this.qbName);
        return queryBuilder.leftJoinAndSelect(`${this.qbName}.parent`, 'parent');
    }

    /**
     * 生成排序的QueryBuilder
     */
    addOrderByQuery(qb: SelectQueryBuilder<E>, orderBy?: OrderQueryType) {
        const orderByQuery = orderBy ?? this.orderBy;
        return !isNil(orderBy) ? getOrderByQuery(qb, this.qbName, orderByQuery) : qb;
    }

    /**
     * 查询树分类
     * @param options
     */
    async findTrees(options?: FindTreeOptions & QueryParams<E>) {
        const roots = await this.findRoots(options);
        await Promise.all(roots.map((root) => this.findDescendantsTree(root, options)));
        return roots;
    }

    /**
     * 查询顶级评论
     * @param options
     */
    async findRoots(options?: FindTreeOptions & QueryParams<E>) {
        const { addQuery, orderBy, withTrashed, onlyTrashed } = options ?? {};
        const escapeAlias = (alias: string) => this.manager.connection.driver.escape(alias);
        const escapeColumn = (column: string) => this.manager.connection.driver.escape(column);

        const joinColumn = this.metadata.treeParentRelation!.joinColumns[0];
        const parentPropertyName = joinColumn.givenDatabaseName || joinColumn.databaseName;

        let qb = this.addOrderByQuery(this.buildBaseQB(), orderBy);
        qb.where(`${escapeAlias(this.qbName)}.${escapeColumn(parentPropertyName)} IS NULL`);
        FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, pick(options, ['relations', 'depth']));
        qb = addQuery ? await addQuery(qb) : qb;
        if (withTrashed) {
            qb.withDeleted();
            if (onlyTrashed) qb.where(`${this.qbName}.deletedAt IS NOT NULL`);
        }
        return qb.getMany();
    }

    /**
     * 查询后代树
     * @param entity
     * @param options
     */
    async findDescendantsTree(entity: E, options?: FindTreeOptions & QueryParams<E>) {
        const { addQuery, orderBy, withTrashed, onlyTrashed } = options ?? {};
        let qb = this.buildBaseQB(
            this.createDescendantsQueryBuilder(this.qbName, 'treeClosure', entity),
        );
        qb = addQuery
            ? await addQuery(this.addOrderByQuery(qb, orderBy))
            : this.addOrderByQuery(qb, orderBy);
        if (withTrashed) {
            qb.withDeleted();
            if (onlyTrashed) qb.where(`${this.qbName}.deletedAt IS NOT NULL`);
        }
        FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, pick(options, ['relations', 'depth']));
        const entities = await qb.getRawAndEntities();
        const relationMaps = TreeRepositoryUtils.createRelationMaps(
            this.manager,
            this.metadata,
            this.qbName,
            entities.raw,
        );
        TreeRepositoryUtils.buildChildrenEntityTree(
            this.metadata,
            entity,
            entities.entities,
            relationMaps,
            {
                depth: -1,
                ...pick(options, ['relations']),
            },
        );

        return entity;
    }

    /**
     * 查询后代元素
     * @param entity
     * @param options
     */
    async findDescendants(entity: E, options?: FindTreeOptions & QueryParams<E>) {
        const { addQuery, orderBy, withTrashed, onlyTrashed } = options ?? {};
        let qb = this.buildBaseQB(
            this.createDescendantsQueryBuilder(this.qbName, 'treeClosure', entity),
        );
        qb = addQuery
            ? await addQuery(this.addOrderByQuery(qb, orderBy))
            : this.addOrderByQuery(qb, orderBy);
        if (withTrashed) {
            qb.withDeleted();
            if (onlyTrashed) qb.where(`${this.qbName}.deletedAt IS NOT NULL`);
        }
        FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, options);
        return qb.getMany();
    }

    /**
     * 查询祖先元素
     * @param entity
     * @param options
     */
    async findAncestors(entity: E, options?: FindTreeOptions & QueryParams<E>) {
        const { addQuery, orderBy, withTrashed, onlyTrashed } = options ?? {};
        let qb = this.buildBaseQB(
            this.createDescendantsQueryBuilder(this.qbName, 'treeClosure', entity),
        );
        FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, options);
        qb = addQuery
            ? await addQuery(this.addOrderByQuery(qb, orderBy))
            : this.addOrderByQuery(qb, orderBy);
        if (withTrashed) {
            qb.withDeleted();
            if (onlyTrashed) qb.where(`${this.qbName}.deletedAt IS NOT NULL`);
        }
        return qb.getMany();
    }

    /**
     * 统计祖先元素数量
     * @param entity
     * @param options
     */
    async countAncestors(entity: E, options?: FindTreeOptions & QueryParams<E>) {
        const { addQuery, orderBy, withTrashed, onlyTrashed } = options ?? {};
        let qb = this.buildBaseQB(
            this.createDescendantsQueryBuilder(this.qbName, 'treeClosure', entity),
        );
        qb = addQuery
            ? await addQuery(this.addOrderByQuery(qb, orderBy))
            : this.addOrderByQuery(qb, orderBy);
        if (withTrashed) {
            qb.withDeleted();
            if (onlyTrashed) qb.where(`${this.qbName}.deletedAt IS NOT NULL`);
        }
        return qb.getCount();
    }

    /**
     * 打平并展开树
     * @param trees
     * @param depth
     */
    async toFlatTrees(trees: E[], depth = 0, parent: E | null = null): Promise<E[]> {
        const data: Omit<E, 'children'>[] = [];
        for (const item of trees) {
            (item as any).depth = depth;
            (item as any).parent = parent;
            const { children } = item;
            unset(item, 'children');
            data.push(item);
            data.push(...(await this.toFlatTrees(children, depth + 1)));
        }
        return data as E[];
    }
}
