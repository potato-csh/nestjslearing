import { toNumber } from 'lodash';

import { createDbConfig } from '@/modules/database/helpers';

/**
 * 数据库配置
 */
// export const database = (): TypeOrmModuleOptions => ({
// charset: 'utf8mb4',
// logging: ['error'],
// type: 'mysql',
// host: '127.0.0.1',
// port: 3306,
// username: 'root',
// password: 'password',
// database: '3r',
// synchronize: true,
// autoLoadEntities: true,
// });

export const database = createDbConfig((configure) => ({
    connections: [
        {
            type: 'mysql',
            host: configure.env('DB_HOST', '127.0.0.1'),
            port: configure.env('DB_PORT', (v) => toNumber(v), 3306),
            username: configure.env('DB_USERNAME', 'root'),
            password: configure.env('DB_PASSWORD', 'password'),
            database: configure.env('DB_NAME', '3r'),
        },
    ],
}));
