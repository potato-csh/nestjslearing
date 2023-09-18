import { isNil } from 'lodash';

import { ConnectionOption, ConnectionRst } from '../types';

/**
 * 生成Typeorm，Redis等连接的配置
 * 通用的配置回调处理的hook
 * 判断传入连接选项是数组还是对象
 * 如果是对象则为单个连接配置，把它变成数组，并把它的name设置成default
 * 如果是多连接则尝试寻找name为default的连接，如果不存在，则把第一个连接的name设置成default
 * 最后使用reduce函数去除name相同的连接并返回
 * @param options
 */
export const createConnectionOptions = <T extends Record<string, any>>(
    options: ConnectionOption<T>,
): ConnectionRst<T> => {
    const config: ConnectionRst<T> = Array.isArray(options)
        ? options
        : [{ ...options, name: 'default' }];
    if (config.length <= 0) return undefined;
    if (isNil(config.find(({ name }) => name === 'default'))) {
        config[0].name = 'default';
    }
    return config.reduce((o, n) => {
        const names = o.map(({ name }) => name) as string[];
        return names.includes(n.name) ? o : [...o, n];
    }, []);
};
