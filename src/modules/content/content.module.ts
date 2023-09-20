// @Module({
//     imports: [
//         TypeOrmModule.forFeature(Object.values(entities)),
//         DatabaseModule.forRepository(Object.values(repositories)),
//     ],
//     controllers: Object.values(controllers),
//     providers: [...Object.values(services), PostSubscriber],
//     exports: [
//         ...Object.values(services),
//         DatabaseModule.forRepository(Object.values(repositories)),
//     ],
// })
// =======================================================================================================================================
// export class ContentModule {
//     static forRoot(configRegister?: () => ContentConfig): DynamicModule {
//         const config: Required<ContentConfig> = {
//             searchType: 'against',
//             ...(configRegister ? configRegister() : {}),
//         };
//         const providers: ModuleMetadata['providers'] = [
//             ...Object.values(services),
//             PostSubscriber,
//             {
//                 provide: PostService,
//                 inject: [
//                     PostRepository,
//                     CategoryRepository,
//                     CategoryService,
//                     { token: SearchService, optional: true },
//                 ],
//                 useFactory(
//                     postRepository: PostRepository,
//                     categoryRepository: CategoryRepository,
//                     categoryService: CategoryService,
//                     searchService?: SearchService,
//                 ) {
//                     return new PostService(
//                         postRepository,
//                         categoryRepository,
//                         categoryService,
//                         searchService,
//                         config.searchType,
//                     );
//                 },
//             },
//         ];
//         if (config.searchType === 'elastic') providers.push(SearchService);
//         return {
//             module: ContentModule,
//             imports: [
//                 TypeOrmModule.forFeature(Object.values(entities)),
//                 DatabaseModule.forRepository(Object.values(repositories)),
//             ],
//             controllers: Object.values(controllers),
//             providers,
//             exports: [
//                 ...Object.values(services),
//                 PostService,
//                 DatabaseModule.forRepository(Object.values(repositories)),
//             ],
//         };
//     }
// }
// =======================================================================================================================================

import { ModuleMetadata } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { ModuleBuilder } from '../core/decorators';

import { DatabaseModule } from '../database/database.module';

import * as controllers from './controllers';
import * as entities from './entities';
import { CategoryRepository, PostRepository } from './repositories';
import * as repositories from './repositories';
import * as services from './services';
import { CategoryService } from './services';
import { PostService } from './services/post.service';
import { SearchService } from './services/search.service';
import { PostSubscriber } from './subscribers';
import { SearchType } from './types';

@ModuleBuilder(async (configure) => {
    const searchType = await configure.get<SearchType>('content.searchType', 'against');
    const providers: ModuleMetadata['providers'] = [
        ...Object.values(services),
        PostSubscriber,
        {
            provide: PostService,
            inject: [
                PostRepository,
                CategoryRepository,
                CategoryService,
                { token: SearchService, optional: true },
            ],
            useFactory(
                postRepository: PostRepository,
                categoryRepository: CategoryRepository,
                categoryService: CategoryService,
                searchService?: SearchService,
            ) {
                return new PostService(
                    postRepository,
                    categoryRepository,
                    categoryService,
                    searchService,
                    searchType,
                );
            },
        },
    ];
    if (configure.has('elastic') && searchType === 'elastic') providers.push(SearchService);
    return {
        imports: [
            TypeOrmModule.forFeature(Object.values(entities)),
            DatabaseModule.forRepository(Object.values(repositories)),
        ],
        controllers: Object.values(controllers),
        providers,
        exports: [
            ...Object.values(services),
            PostService,
            DatabaseModule.forRepository(Object.values(repositories)),
        ],
    };
})
export class ContentModule {}
