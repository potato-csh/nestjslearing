import { Controller, Get, Query, SerializeOptions } from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseControllerWithTrash } from '@/modules/restful/base';

import { Crud } from '@/modules/restful/decorators';

import { Depends } from '@/modules/restful/decorators/depends.decorator';
import { createHookOption } from '@/modules/restful/helpers';

import { ContentModule } from '../content.module';
import { CreateCategoryDto, QueryCategoryTreeDto, UpdateCategoryDto } from '../dtos/category.dto';
import { CategoryService } from '../services';

@ApiTags('分类')
@Depends(ContentModule)
@Crud(async () => ({
    id: 'category',
    enabled: [
        {
            name: 'list',
            option: createHookOption('分类查询,以分页模式展示'),
        },
        {
            name: 'detail',
            option: createHookOption('分类详情'),
        },
        {
            name: 'store',
            option: createHookOption('创建分类'),
        },
        {
            name: 'update',
            option: createHookOption('更新分类'),
        },
        {
            name: 'delete',
            option: createHookOption('删除分类'),
        },
        {
            name: 'restore',
            option: createHookOption('恢复分类'),
        },
    ],
    dtos: {
        store: CreateCategoryDto,
        update: UpdateCategoryDto,
    },
}))
@Controller('categories')
export class CategoryController extends BaseControllerWithTrash<CategoryService> {
    constructor(protected service: CategoryService) {
        super(service);
    }

    @Get('tree')
    @ApiOperation({ summary: '树形结构分类查询' })
    @SerializeOptions({ groups: ['category-tree'] })
    async tree(
        @Query()
        options: QueryCategoryTreeDto,
    ) {
        return this.service.findTrees(options);
    }
}
