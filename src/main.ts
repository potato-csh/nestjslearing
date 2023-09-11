import { NestFactory } from '@nestjs/core';

import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
    // 指定url前缀
    app.setGlobalPrefix('api');
    // 允许跨域
    app.enableCors();
    // console.log('service starting...');
    await app.listen(3000);
}
bootstrap();
