import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsUUID } from 'class-validator';

import { DtoValidation } from '@/modules/core/decorators/dto-validation.decorator';

/**
 * 批量删除验证
 */
@DtoValidation()
export class DeleteDto {
    @ApiPropertyOptional({
        description: '待删除的ID列表',
        type: [String],
    })
    @IsUUID(undefined, {
        each: true,
        message: 'ID格式错误',
    })
    @IsDefined({
        each: true,
        message: 'ID必须指定',
    })
    ids: string[] = [];
}
