import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsDefined,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsUUID,
    MaxLength,
    Min,
    ValidateIf,
} from 'class-validator';
import { toNumber } from 'lodash';

import { DtoValidation } from '@/modules/core/decorators/dto-validation.decorator';
import { SelectTrashMode } from '@/modules/database/constants';
import { IsDataExist, IsTreeUnique, IsTreeUniqueExist } from '@/modules/database/constraints';

import { CategoryEntity } from '../entities';

/**
 * 树形分类查询验证
 */
@DtoValidation({ type: 'query' })
export class QueryCategoryTreeDto {
    @ApiPropertyOptional({
        description:
            '回收站数据过滤,all:包含已软删除和未软删除的数据;only:只包含软删除的数据;none:只包含未软删除的数据',
        enum: SelectTrashMode,
    })
    @IsEnum(SelectTrashMode)
    @IsOptional()
    trashed?: SelectTrashMode;
}

// @DtoValidation({ type: 'query' })
// export class QueryCategoryDto extends QueryCategoryTreeDto implements PaginateOptions {
//     @Transform(({ value }) => toNumber(value))
//     @Min(1, { message: `当前页必须大于1` })
//     @IsNumber()
//     @IsOptional()
//     page = 1;

//     @Transform(({ value }) => toNumber(value))
//     @Min(1, { message: `当前页必须大于1` })
//     @IsNumber()
//     @IsOptional()
//     limit = 10;
// }

@DtoValidation({ groups: ['create'] })
export class CreateCategoryDto {
    @ApiProperty({
        description: '分类名称:同一个父分类下的同级别子分类名称具有唯一性',
        uniqueItems: true,
        maxLength: 25,
    })
    @IsTreeUnique(CategoryEntity, {
        groups: ['create'],
        message: '分类名称重复',
    })
    @IsTreeUniqueExist(CategoryEntity, {
        groups: ['update'],
        message: '分类名称重复',
    })
    @MaxLength(25, {
        always: true,
        message: `分类名称长度不得超过$constraint1`,
    })
    @IsNotEmpty({ groups: ['create'], message: `分类名称不得为空` })
    @IsOptional({ groups: ['update'] })
    name: string;

    @ApiProperty({
        description: '父分类ID',
    })
    @IsDataExist(CategoryEntity, { always: true, message: '父分类不存在' })
    @IsUUID(undefined, { always: true, message: '父分类ID格式不正确' })
    @IsOptional({ always: true })
    @ValidateIf((value) => value.parent !== null && value.parent)
    @Transform(({ value }) => (value === 'null' ? null : value))
    parent?: string;

    @ApiProperty({
        description: '自定义排序:该排序仅生效于同一父分类的同级别下的子分类(包括顶级分类)',
        type: Number,
        minimum: 0,
        default: 0,
    })
    @Transform(({ value }) => toNumber(value))
    @Min(0, { message: '排序值必须大于0' })
    @IsNumber(undefined, { always: true })
    @IsOptional({ always: true })
    customOrder = 0;
}

@DtoValidation({ groups: ['update'] })
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
    @ApiProperty({
        description: '待更新的分类ID',
    })
    @IsUUID(undefined, { groups: ['update'], message: '文章ID格式错误' })
    @IsDefined({ groups: ['update'], message: '文章ID必须指定' })
    id: string;
}
