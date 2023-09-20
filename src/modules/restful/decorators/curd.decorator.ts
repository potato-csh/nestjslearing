import { SetMetadata, Type } from '@nestjs/common';

import { BaseController, BaseControllerWithTrash } from '../base';
import { CONTROLLER_DEPENDS, CRUD_OPTIONS_REGISTER } from '../constants';
import { CrudOptionsRegister } from '../types';

/**
 * 只用于存储生成函数
 * @param factory 

 */
export const Crud =
    (factory: CrudOptionsRegister) =>
    <T extends BaseController<any> | BaseControllerWithTrash<any>>(Target: Type<T>) => {
        Reflect.defineMetadata(CRUD_OPTIONS_REGISTER, factory, Target);
    };

export const Depends = (...depends: Type<any>[]) => SetMetadata(CONTROLLER_DEPENDS, depends ?? []);
