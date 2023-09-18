import { ElasticsearchModule, ElasticsearchModuleOptions } from '@nestjs/elasticsearch';

import { ModuleBuilder } from '../core/decorators';

// @Module({})
// export class ElasticModule {
//     static forRoot(configRegister: () => ElasticsearchModuleOptions): DynamicModule {
//         return {
//             module: ElasticModule,
//             global: true,
//             imports: [ElasticsearchModule.register(configRegister())],
//             exports: [ElasticsearchModule],
//         };
//     }
// }

@ModuleBuilder(async (configure) => ({
    global: true,
    imports: [
        ElasticsearchModule.register(await configure.get<ElasticsearchModuleOptions>('elastic')),
    ],
    exports: [ElasticsearchModule],
}))
export class ElasticModule {}
