import { MODULE_BUILDER_REGISTER } from '../constants';
import { ModuleMetaRegister } from '../types';

/**
 * 替换默认的@Moudle模块装饰器, 可以传入一个模块元数据注册函数来构建metadata元数据，通过MODULE_BUILDER_REGISTER来存储
 */
export function ModuleBuilder<P extends Record<string, any>>(register: ModuleMetaRegister<P>) {
    return <M extends new (...args: any[]) => any>(targert: M) => {
        Reflect.defineMetadata(MODULE_BUILDER_REGISTER, register, targert);
        return targert;
    };
}
