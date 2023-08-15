import { unset } from 'lodash';
import { FindOptionsUtils, FindTreeOptions, SelectQueryBuilder, TreeRepository } from 'typeorm';

import { CustomRepository } from '@/modules/database/decorators/repository.decorator';

import { CategoryEntity } from '../entities';

@CustomRepository(CategoryEntity)
export class CategoryRepository extends TreeRepository<CategoryEntity> {
    /**
     * 构建基础查询
     */
    buildBaseQB() {
        return this.createQueryBuilder('category').leftJoinAndSelect('category.parent', 'parent');
    }

    /**
     * 查询顶级分类
     */
    findRoots(options?: FindTreeOptions): Promise<CategoryEntity[]> {
        const escapeAlias = (alias: string) => this.manager.connection.driver.escape(alias);
        const escapeColumn = (column: string) => this.manager.connection.driver.escape(column);

        const joinColumn = this.metadata.treeParentRelation!.joinColumns[0];
        const parentPropertyName = joinColumn.givenDatabaseName || joinColumn.databaseName;

        const qb = this.buildBaseQB().orderBy('category.customOrder', 'ASC');
        FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, options);

        return qb
            .where(`${escapeAlias('treeEntity')}.${escapeColumn(parentPropertyName)} IS NULL`)
            .getMany();
    }

    /**
     * 创建后代查询器
     */
    createDescendantsQueryBuilder(
        alias: string,
        closureTableAlias: string,
        entity: CategoryEntity,
    ): SelectQueryBuilder<CategoryEntity> {
        return super
            .createDescendantsQueryBuilder(alias, closureTableAlias, entity)
            .orderBy(`${alias}.customOrder`, 'ASC');
    }

    /**
     * 创建祖先查询器
     */
    createAncestorsQueryBuilder(
        alias: string,
        closureTableAlias: string,
        entity: CategoryEntity,
    ): SelectQueryBuilder<CategoryEntity> {
        return super
            .createDescendantsQueryBuilder(alias, closureTableAlias, entity)
            .orderBy(`${alias}.customOrder`, 'ASC');
    }

    /**
     * 打平并展开树
     */
    async toFlatTrees(trees: CategoryEntity[], depth = 0, parent: CategoryEntity | null = null) {
        const data: Omit<CategoryEntity, 'children'>[] = [];
        for (const item of trees) {
            item.depth = depth;
            item.parent = parent;
            const { children } = item;
            unset(item, 'children');
            data.push(item);
            data.push(...(await this.toFlatTrees(children, depth + 1, item)));
        }
        return data as CategoryEntity[];
    }
}
