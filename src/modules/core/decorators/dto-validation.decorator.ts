import { Paramtype, SetMetadata } from '@nestjs/common';
import { ClassTransformOptions } from 'class-transformer';
import { ValidatorOptions } from 'class-validator';

import { DTO_VALIDATION_OPTIONS } from '../constants';

export const DtoValidation = (
    options?: ValidatorOptions & {
        transformOptions?: ClassTransformOptions;
    } & { type?: Paramtype },
) => SetMetadata(DTO_VALIDATION_OPTIONS, options ?? {});
