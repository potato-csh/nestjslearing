import { DynamicModule, Module } from '@nestjs/common';
import { ElasticsearchModule, ElasticsearchModuleOptions } from '@nestjs/elasticsearch';

@Module({})
export class ElasticModule {
    static forRoot(configRegister: () => ElasticsearchModuleOptions): DynamicModule {
        return {
            module: ElasticModule,
            global: true,
            imports: [ElasticsearchModule.register(configRegister())],
            exports: [ElasticsearchModule],
        };
    }
}
