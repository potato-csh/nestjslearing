import { INestApplication, Type } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { omit, trim } from 'lodash';

import { RouterConfigure } from './configure';
import { genDocPath } from './helpers';
import {
    ApiConfig,
    ApiDocOption,
    ApiDocSource,
    ApiRouteOption,
    ApiSwaggerOption,
    ApiVersionOption,
} from './types';

/**
 * 配置构造类
 */
export class Restful extends RouterConfigure {
    // 属性
    protected _docs: {
        [version: string]: ApiDocOption;
    };

    /**
     * 排除已添加的模块
     */
    protected excludeVersionModules: string[] = [];

    async create(config: ApiConfig) {
        this.createConfig(config);
        await this.createRoutes();
        this.createDocs();
    }

    getModuleImports() {
        return [...Object.values(this.modules), RouterModule.register(this.routes)];
    }

    get docs() {
        return this.docs;
    }

    /**
     * 生成路由文档
     * @param option
     * @param routes
     * @param parent
     */
    protected getRouteDocs(
        option: Omit<ApiSwaggerOption, 'include'>,
        routes: ApiRouteOption[],
        parent?: string,
    ): { [key: string]: ApiSwaggerOption } {
        const mergeDoc = (vDoc: Omit<ApiSwaggerOption, 'include'>, route: ApiRouteOption) => ({
            ...vDoc,
            ...route.doc,
            tags: Array.from(new Set([...(vDoc.tags ?? []), ...(route.doc?.tags ?? [])])),
            path: genDocPath(route.path, this.config.prefix?.doc, parent),
            include: this.getRouteModules([route], parent),
        });
        let routeDocs: { [key: string]: ApiSwaggerOption } = {};

        // 判断路由是否有除tags之外的其他doc属性
        const hasAdditional = (doc?: ApiDocSource) =>
            doc && Object.keys(omit(doc, 'tag')).length > 0;

        for (const route of routes) {
            const { name, doc, children } = route;
            const moduleName = parent ? `${parent}.${name}` : name;

            // 添加到routeDocs中
            if (hasAdditional(doc)) {
                routeDocs[moduleName.replace(`${option.version}.`, '')] = mergeDoc(option, route);
            }
            if (children) {
                routeDocs = {
                    ...routeDocs,
                    ...this.getRouteDocs(option, children, moduleName),
                };
            }
        }
        return routeDocs;
    }

    /**
     * 排除已添加到文档include中的模块
     * @param routeModule
     */
    protected filterExcludeModules(routeModule: Type<any>[]) {
        const excludeModules: Type<any>[] = [];
        const excludeNmaes = Array.from(new Set(this.excludeVersionModules));
        for (const [name, module] of Object.entries(this._modules)) {
            if (excludeNmaes.includes(name)) excludeModules.push(module);
        }
        return routeModule.filter(
            (rmodule) => !excludeModules.find((emodule) => emodule === rmodule),
        );
    }

    /**
     * 通过该方法生成每个版本的文档配置
     * @param name
     * @param voption
     * @param isDefault
     */
    protected getDocOption(name: string, voption: ApiVersionOption, isDefault = false) {
        const docConfig: ApiDocOption = {};
        // 默认文档配置
        const defaultDoc = {
            title: voption.title,
            description: voption.description,
            tags: voption.tags ?? [],
            auth: voption.auth ?? false,
            version: name,
            path: trim(`${this.config.prefix?.doc}${isDefault ? '' : `/${name}`}`, '/'),
        };
        // 获取路由文档
        const routesDoc = isDefault
            ? this.getRouteDocs(defaultDoc, voption.routes ?? [])
            : this.getRouteDocs(defaultDoc, voption.routes ?? [], name);
        if (Object.keys(routesDoc).length > 0) {
            docConfig.routes = routesDoc;
        }
        const routeModules = isDefault
            ? this.getRouteModules(voption.routes ?? [])
            : this.getRouteModules(voption.routes ?? [], name);

        // 文档所依赖的模块
        const include = this.filterExcludeModules(routeModules);
        // 版本Doc中有依赖路由模块或者版本doc中没有路由doc则添加版本doc
        if (include.length > 0 || !docConfig.routes) {
            docConfig.default = { ...defaultDoc, include };
        }
        return docConfig;
    }

    /**
     * 创建文档配置
     */
    protected createDocs() {
        const versionMaps = Object.entries(this.config.versions);
        const vDoc = versionMaps.map(([name, version]) => [name, this.getDocOption(name, version)]);
        this._docs = Object.fromEntries(vDoc);
        const defaultVersion = this.config.versions[this._default];
        // 为默认版本再生成一个文档
        this._docs.default = this.getDocOption(this._default, defaultVersion, true);
    }

    /**
     * 构建openapi
     * @param app
     */
    factoryDocs<T extends INestApplication>(app: T) {
        const docs = Object.values(this._docs)
            .map((vdoc) => [vdoc.default, ...Object.values(vdoc.routes ?? [])])
            .reduce((o, n) => [...o, ...n], [])
            .filter((i) => !!i);
        for (const voption of docs) {
            const { title, description, version, auth, include, tags } = voption;
            const builder = new DocumentBuilder();
            if (title) builder.setTitle(title);
            if (description) builder.setDescription(description);
            if (auth) builder.addBearerAuth();
            if (tags) {
                tags.forEach((tag) =>
                    typeof tag === 'string'
                        ? builder.addTag(tag)
                        : builder.addTag(tag.name, tag.description, tag.externalDocs),
                );
            }
            builder.setVersion(version);
            const document = SwaggerModule.createDocument(app, builder.build(), {
                include: include.length > 0 ? include : [() => undefined as any],
            });
            SwaggerModule.setup(voption.path, app, document);
        }
    }
}
