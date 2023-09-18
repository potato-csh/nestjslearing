// async function bootstrap() {
//     const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
//     // 指定url前缀
//     app.setGlobalPrefix('api');
//     // 允许跨域
//     app.enableCors();
//     // console.log('service starting...');
//     await app.listen(3000);
// }
// bootstrap();

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { bootApp, createApp } from '@/modules/core/helpers/app';

import * as configs from './config';

import { ContentModule } from './modules/content/content.module';

bootApp(
    createApp({
        configs,
        configure: { storage: true },
        modules: [ContentModule],
        builder: async ({ configure, BootModule }) => {
            return NestFactory.create<NestFastifyApplication>(BootModule, new FastifyAdapter(), {
                cors: true,
                logger: ['error', 'warn'],
            });
        },
    }),
);
