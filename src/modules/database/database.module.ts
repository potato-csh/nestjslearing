import { exit } from 'process';

import { DynamicModule, ModuleMetadata, Provider, Type } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions, getDataSourceToken } from '@nestjs/typeorm';

import { DataSource, ObjectType } from 'typeorm';

import { ModuleBuilder } from '../core/decorators';

import { CUSTOM_REPOSITORY_METADATA } from './constants';
import {
    DataExistConstraint,
    UniqueConstraint,
    UniqueExistContraint,
    UniqueTreeConstraint,
    UniqueTreeExistConstraint,
} from './constraints';
import { DbConfig } from './types';

// @Module({})
// export class DatabaseModule {
//     static forRoot(configRegister: () => TypeOrmModuleOptions): DynamicModule {
//         return {
//             module: DatabaseModule,
//             global: true,
//             imports: [TypeOrmModule.forRoot(configRegister())],
//         };
//     }

//     /**
//      * 背景: typeorm0.3中是通过dataSource.getRepository来获取Repository，但是nestjs中无法获得dataSource，只有通过注入的方式才可以获取；
//      *      默认只能获取内置的一些方法，无法进行扩展extend。
//      * 作用: 为每个传入的 repositories 中的类型创建一个提供者（Provider）,
//      *      并将这些提供者添加到 providers 数组中。
//      *      这些提供者将用于在模块中注册相关的依赖注入。
//      * @param repositories
//      * @param dataSourceName
//      */
//     static forRepository<T extends Type<any>>(
//         repositories: T[],
//         dataSourceName?: string, // 数据连接池，默认是default
//     ): DynamicModule {
//         const providers: Provider[] = [];

//         for (const Repo of repositories) {
//             const entity = Reflect.getMetadata(CUSTOM_REPOSITORY_METADATA, Repo);

//             if (!entity) {
//                 continue;
//             }
//             /**
//              * 添加一个提供者对象到 providers 数组中，提供者的属性包括：
//              *      inject：依赖的其他服务或模块的标记数组，这里使用 getDataSourceToken 方法生成数据源的标记。
//              *      provide：提供的仓库类型，即 Repo。
//              *      useFactory：使用工厂函数创建仓库实例。工厂函数接收一个 dataSource 参数，返回一个 Repo 类型的实例。
//              * 在工厂函数内部，调用 dataSource.getRepository 方法获取 entity 对应的默认仓库对象。
//              * 使用 Repo 类的构造函数创建一个新的 Repo 实例，传入获取到的默认仓库对象的属性。
//              */
//             providers.push({
//                 // inject: [getDataSourceToken('数据连接池，默认是default')],
//                 inject: [getDataSourceToken(dataSourceName)],
//                 provide: Repo,
//                 /**
//                  * 将 dataSource注入进去
//                  * 1、获取entity的默认Repository对象
//                  * 1.1、这个是默认Repository的构造函数
//                  *      constructor(target: EntityTarget<Entity>, manager: EntityManager, queryRunner?: QueryRunner);
//                  * 2、返回实例化的Repository对象
//                  * @param dataSource
//                  */
//                 useFactory: (dataSource: DataSource): InstanceType<typeof Repo> => {
//                     const base = dataSource.getRepository<ObjectType<any>>(entity);
//                     return new Repo(base.target, base.manager, base.queryRunner);
//                 },
//             });
//         }

//         return {
//             exports: providers,
//             module: DatabaseModule,
//             providers,
//         };
//     }
// }

@ModuleBuilder(async (configure) => {
    const imports: ModuleMetadata['imports'] = [];

    if (!configure.has('database')) {
        throw new Error('Database config not exists or not right!');
        exit(1);
    }
    const { connections } = await configure.get<DbConfig>('database');
    // console.log(configure);
    for (const dbOption of connections) {
        imports.push(TypeOrmModule.forRoot(dbOption as TypeOrmModuleOptions));
    }
    const providers: ModuleMetadata['providers'] = [
        DataExistConstraint,
        UniqueConstraint,
        UniqueExistContraint,
        UniqueTreeConstraint,
        UniqueTreeExistConstraint,
    ];

    return {
        global: true,
        imports,
        providers,
    };
})
export class DatabaseModule {
    /**
     * 背景: typeorm0.3中是通过dataSource.getRepository来获取Repository，但是nestjs中无法获得dataSource，只有通过注入的方式才可以获取；
     *      默认只能获取内置的一些方法，无法进行扩展extend。
     * 作用: 为每个传入的 repositories 中的类型创建一个提供者（Provider）,
     *      并将这些提供者添加到 providers 数组中。
     *      这些提供者将用于在模块中注册相关的依赖注入。
     * @param repositories
     * @param dataSourceName
     */
    static forRepository<T extends Type<any>>(
        repositories: T[],
        dataSourceName?: string, // 数据连接池，默认是default
    ): DynamicModule {
        const providers: Provider[] = [];
        for (const Repo of repositories) {
            const entity = Reflect.getMetadata(CUSTOM_REPOSITORY_METADATA, Repo);

            if (!entity) {
                continue;
            }
            /**
             * 添加一个提供者对象到 providers 数组中，提供者的属性包括：
             *      inject：依赖的其他服务或模块的标记数组，这里使用 getDataSourceToken 方法生成数据源的标记。
             *      provide：提供的仓库类型，即 Repo。
             *      useFactory：使用工厂函数创建仓库实例。工厂函数接收一个 dataSource 参数，返回一个 Repo 类型的实例。
             * 在工厂函数内部，调用 dataSource.getRepository 方法获取 entity 对应的默认仓库对象。
             * 使用 Repo 类的构造函数创建一个新的 Repo 实例，传入获取到的默认仓库对象的属性。
             */
            providers.push({
                // inject: [getDataSourceToken('数据连接池，默认是default')],
                inject: [getDataSourceToken(dataSourceName)],
                provide: Repo,
                /**
                 * 将 dataSource注入进去
                 * 1、获取entity的默认Repository对象
                 * 1.1、这个是默认Repository的构造函数
                 *      constructor(target: EntityTarget<Entity>, manager: EntityManager, queryRunner?: QueryRunner);
                 * 2、返回实例化的Repository对象
                 * @param dataSource
                 */
                useFactory: (dataSource: DataSource): InstanceType<typeof Repo> => {
                    const base = dataSource.getRepository<ObjectType<any>>(entity);
                    return new Repo(base.target, base.manager, base.queryRunner);
                },
            });
        }

        return {
            exports: providers,
            module: DatabaseModule,
            providers,
        };
    }
}
