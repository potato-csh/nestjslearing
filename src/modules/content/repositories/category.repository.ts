import { BaseTreeRepository } from '@/modules/database/base/tree.repository';
import { OrderType, TreeChildrenResolve } from '@/modules/database/constants';
import { CustomRepository } from '@/modules/database/decorators/repository.decorator';

import { CategoryEntity } from '../entities';

@CustomRepository(CategoryEntity)
export class CategoryRepository extends BaseTreeRepository<CategoryEntity> {
    protected _qbName = 'category';

    protected orderBy: { name: 'customOrder'; order: OrderType.ASC };

    protected _childrenResolve?: TreeChildrenResolve.UP;
}
