import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from '../database/database.module';

import { PostController } from './controllers';
import { PostEntity } from './entities';
import { PostRepository } from './repositories';
import { PostService } from './services';

@Module({
    imports: [
        TypeOrmModule.forFeature([PostEntity]),
        DatabaseModule.forRepository([PostRepository]),
    ],
    controllers: [PostController],
    providers: [PostService],
    exports: [PostService, DatabaseModule.forRepository([PostRepository])],
})
export class ContentModule {}
