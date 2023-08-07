import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions, getDataSourceToken } from '@nestjs/typeorm';

import { DataSource, ObjectType } from 'typeorm';

import { CUSTOM_REPOSITORY_METADATA } from './constants';

@Module({})
export class DatabaseModule {
    static forRoot(configRegister: () => TypeOrmModuleOptions): DynamicModule {
        return {
            module: DatabaseModule,
            global: true,
            imports: [TypeOrmModule.forRoot(configRegister())],
        };
    }

    /**
     * typeorm0.3中是通过dataSource.getRepository来获取Repository，但是nestjs中无法获得dataSource，只有通过注入的方式才可以获取；
     * 默认只能获取内置的一些方法，无法进行扩展extend。
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

            providers.push({
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
