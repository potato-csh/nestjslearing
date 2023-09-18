import { resolve } from 'path';

import { isNil } from 'lodash';
import { DataSource, ObjectLiteral, ObjectType, Repository, SelectQueryBuilder } from 'typeorm';

import { Configure } from '../core/configure';
import { EnvironmentType } from '../core/constants';
import { deepMerge } from '../core/helpers';
import { createConnectionOptions } from '../core/helpers/options';
import { ConfigureFactory, ConfigureRegister } from '../core/types';

import { CUSTOM_REPOSITORY_METADATA } from './constants';
import { DbConfig, DbConfigOptions, PaginateOptions, PaginateReturn } from './types';

/**
 * 创建数据库配置
 * @param configure
 * @param options
 */
export const createDbOptions = (configure: Configure, options: DbConfigOptions) => {
    const newOptions: DbConfigOptions = {
        common: deepMerge(
            {
                charset: 'utf8mb4',
                logging: ['error'],
                migrations: [],
                paths: {
                    migration: resolve(__dirname, '../../database/migrations'),
                },
            },
            options.common ?? {},
            'replace',
        ),
        connections: createConnectionOptions(options.connections ?? []),
    };
    newOptions.connections = newOptions.connections.map((connection) => {
        const entities = connection.entities ?? [];
        const newOption = { ...connection, entities };
        return deepMerge(
            newOptions.common,
            {
                ...newOption,
                synchronize: configure.getRunEnv() !== EnvironmentType.PRODUCTION,
                autoLoadEntities: true,
            } as any,
            'replace',
        );
    });
    return newOptions as DbConfig;
};

/**
 * 配置构建函数（动态配置系统）
 */
export const createDbConfig: (
    register: ConfigureRegister<Partial<DbConfigOptions>>,
) => ConfigureFactory<DbConfigOptions, DbConfig> = (register) => ({
    register,
    hook: (configure, value) => createDbOptions(configure, value),
    defaultRegister: () => ({
        common: {
            charset: 'utf8mb4',
            logging: ['error'],
        },
        connections: [],
    }),
});

/**
 * 分页函数
 * @param qb queryBuilder实例
 * @param options 分页选项
 */
export const paginate = async <E extends ObjectLiteral>(
    qb: SelectQueryBuilder<E>,
    options: PaginateOptions,
): Promise<PaginateReturn<E>> => {
    const start = options.page > 0 ? options.page - 1 : 0;
    const totalItems = await qb.getCount();
    qb.take(options.limit).skip(start * options.limit);
    const items = await qb.getMany();
    const totalPages =
        totalItems % options.limit === 0
            ? Math.floor(totalItems / options.limit)
            : Math.floor(totalItems / options.limit) + 1;
    const remainder = totalItems % options.limit !== 0 ? totalItems % options.limit : options.limit;
    const itemCount = options.page < totalPages ? options.limit : remainder;
    return {
        items,
        meta: {
            totalItems,
            itemCount,
            perPage: options.limit,
            totalPages,
            currentPage: options.page,
        },
    };
};

/**
 * 数据手动分页函数
 */
export function treePaginate<E extends ObjectLiteral>(
    options: PaginateOptions,
    data: E[],
): PaginateReturn<E> {
    const { page, limit } = options;
    let items: E[] = [];
    const totalItems = data.length;
    const totalRst = totalItems / limit;
    const totalPages =
        totalRst > Math.floor(totalRst) ? Math.floor(totalRst) + 1 : Math.floor(totalRst);
    let itemCount = 0;
    if (page <= totalPages) {
        itemCount = page === totalPages ? totalItems - (totalPages - 1) * limit : limit;
        const start = (page - 1) * limit;
        items = data.slice(start, start + itemCount);
    }

    return {
        items,
        meta: {
            totalItems,
            itemCount,
            perPage: options.limit,
            totalPages,
            currentPage: options.page,
        },
    };
}

/**
 * 获取自定义Repository的实例
 * @param dataSource 数据库连接池
 * @param Repo repository类
 */
export const getCustomRepository = <T extends Repository<E>, E extends ObjectLiteral>(
    dataSource: DataSource,
    Repo: ClassType<T>,
): T => {
    if (isNil(Repo)) return null;
    const entity = Reflect.getMetadata(CUSTOM_REPOSITORY_METADATA, Repo);
    if (!entity) return null;
    const base = dataSource.getRepository<ObjectType<any>>(entity);
    return new Repo(base.target, base.manager, base.queryRunner) as T;
};
