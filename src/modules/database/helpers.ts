import { resolve } from 'path';

import { isNil } from 'lodash';
import { DataSource, ObjectLiteral, ObjectType, Repository, SelectQueryBuilder } from 'typeorm';

import { Configure } from '../core/configure';
import { EnvironmentType } from '../core/constants';
import { deepMerge, createConnectionOptions } from '../core/helpers';

import { ConfigureFactory, ConfigureRegister } from '../core/types';

import { CUSTOM_REPOSITORY_METADATA } from './constants';

import {
    DbConfig,
    DbConfigOptions,
    OrderQueryType,
    PaginateOptions,
    PaginateReturn,
} from './types';

/**
 * 创建数据库配置
 * @param options 自定义配置
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

export const createDbConfig: (
    register: ConfigureRegister<RePartial<DbConfigOptions>>,
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
    const totalPages = Math.ceil(totalItems / options.limit);
    const itemCount =
        // eslint-disable-next-line no-nested-ternary
        options.page < totalPages ? options.limit : options.page === totalPages ? totalItems : 0;
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
 * @param options 分页选项
 * @param data 数据列表
 */
export function manualPaginate<E extends ObjectLiteral>(
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
        meta: {
            itemCount,
            totalItems,
            perPage: limit,
            totalPages,
            currentPage: page,
        },
        items,
    };
}

/**
 * 为查询添加排序,默认排序规则为DESC
 * @param qb 原查询
 * @param alias 别名
 * @param orderBy 查询排序
 */
export const getOrderByQuery = <E extends ObjectLiteral>(
    qb: SelectQueryBuilder<E>,
    alias: string,
    orderBy?: OrderQueryType,
) => {
    if (isNil(orderBy)) return qb;
    if (typeof orderBy === 'string') return qb.orderBy(`${alias}.${orderBy}`, 'DESC');
    if (Array.isArray(orderBy)) {
        const i = 0;
        for (const item of orderBy) {
            if (i === 0) {
                typeof item === 'string'
                    ? qb.orderBy(`${alias}.${item}`, 'DESC')
                    : qb.orderBy(`${alias}.${item.name}`, item.order);
            } else {
                typeof item === 'string'
                    ? qb.addOrderBy(`${alias}.${item}`, 'DESC')
                    : qb.addOrderBy(`${alias}.${item.name}`, item.order);
            }
        }
        return qb;
    }
    return qb.orderBy(`${alias}.${(orderBy as any).name}`, (orderBy as any).order);
};

/**
 * 获取自定义Repository的实例
 * @param dataSource 数据连接池
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
