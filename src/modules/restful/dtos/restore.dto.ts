import { IsDefined, IsUUID } from 'class-validator';

import { DtoValidation } from '@/modules/core/decorators/dto-validation.decorator';

@DtoValidation()
export class RestoreDto {
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
