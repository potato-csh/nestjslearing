import { FindOptionsUtils, FindTreeOptions, TreeRepository } from 'typeorm';

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
}
