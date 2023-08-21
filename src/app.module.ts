import { Module } from '@nestjs/common';

import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

import { database } from './config/database.config';
import { ContentModule } from './modules/contents/content.module';
import { AppFilter } from './modules/core/providers/app.filter';
import { AppIntercepter } from './modules/core/providers/app.interceptor';
import { AppPipe } from './modules/core/providers/app.pipe';
import { DatabaseModule } from './modules/database/database.module';

@Module({
    imports: [DatabaseModule.forRoot(database), ContentModule],
    providers: [
        {
            provide: APP_PIPE,
            useValue: new AppPipe({
                transform: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            }),
        },
        {
            provide: APP_INTERCEPTOR,
            useValue: AppIntercepter,
        },
        {
            provide: APP_FILTER,
            useClass: AppFilter,
        },
    ],
})
export class AppModule {}
