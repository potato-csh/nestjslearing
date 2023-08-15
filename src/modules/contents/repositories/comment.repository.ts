import { unset } from 'lodash';

import {
    FindOptionsUtils,
    FindTreeOptions,
    SelectQueryBuilder,
    TreeRepository,
    TreeRepositoryUtils,
} from 'typeorm';

import { CustomRepository } from '@/modules/database/decorators/repository.decorator';

import { CommentEntity } from '../entities';

type FindCommentTreeOptions = FindTreeOptions & {
    addQuery?: (query: SelectQueryBuilder<CommentEntity>) => SelectQueryBuilder<CommentEntity>;
};

@CustomRepository(CommentEntity)
export class CommentRepository extends TreeRepository<CommentEntity> {
    /**
     * 创建基础查询器
     */
    buildBaseQB(qb: SelectQueryBuilder<CommentEntity>): SelectQueryBuilder<CommentEntity> {
        return this.createQueryBuilder('comments')
            .leftJoinAndSelect(`comment.parent`, 'parent')
            .leftJoinAndSelect(`comment.post`, 'post')
            .orderBy('comment.createdAt', 'DESC');
    }

    /**
     * 查询树
     */
    async findTrees(options?: FindTreeOptions): Promise<CommentEntity[]> {
        options.relations = ['parent', 'children'];
        const roots = await this.findRoots(options);
        await Promise.all(roots.map((root) => this.findDescendantsTree(root, options)));
        return roots;
    }

    /**
     * 查询顶级评论
     */
    findRoots(options: FindCommentTreeOptions = {}) {
        const { addQuery, ...rest } = options;
        const escapeAlias = (alias: string) => this.manager.connection.driver.escape(alias);
        const escapeColumn = (column: string) => this.manager.connection.driver.escape(column);

        const joinColumn = this.metadata.treeParentRelation!.joinColumns[0];
        const parentPropertyName = joinColumn.givenDatabaseName || joinColumn.databaseName;

        let qb = this.buildBaseQB(this.createQueryBuilder('comment'));
        FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, rest);

        qb.where(`${escapeAlias('comment')}.${escapeColumn(parentPropertyName)} IS NULL`);
        qb = addQuery ? addQuery(qb) : qb;
        return qb.getMany();
    }

    /**
     * 创建后代查询器
     */
    createDtsQueryBuilder(
        closureTableAlias: string,
        entity: CommentEntity,
        options: FindCommentTreeOptions = {},
    ): SelectQueryBuilder<CommentEntity> {
        const { addQuery } = options;
        const qb = this.buildBaseQB(
            super.createDescendantsQueryBuilder('comment', closureTableAlias, entity),
        );
        return addQuery ? addQuery(qb) : qb;
    }

    /**
     * 查询后代树
     */
    async findDescendantsTree(
        entity: CommentEntity,
        options?: FindTreeOptions,
    ): Promise<CommentEntity> {
        const qb: SelectQueryBuilder<CommentEntity> = this.createDtsQueryBuilder(
            'treeClosure',
            entity,
            options,
        );
        FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, options);

        const entities = await qb.getRawAndEntities();
        const relationMaps = TreeRepositoryUtils.createRelationMaps(
            this.manager,
            this.metadata,
            'treeEntity',
            entities.raw,
        );
        TreeRepositoryUtils.buildChildrenEntityTree(
            this.metadata,
            entity,
            entities.entities,
            relationMaps,
            {
                depth: -1,
                ...options,
            },
        );

        return entity;
    }

    /**
     * 打平并展开树
     */
    async toFlatTrees(trees: CommentEntity[], depth = 0) {
        const data: Omit<CommentEntity, 'children'>[] = [];
        for (const item of trees) {
            item.depth = depth;
            const { children } = item;
            unset(item, 'children');
            data.push(item);
            data.push(...(await this.toFlatTrees(children, depth + 1)));
        }
        return data as CommentEntity[];
    }
}
