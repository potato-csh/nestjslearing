import { Type } from '@nestjs/common';
import { Routes, RouteTree } from '@nestjs/core';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as chalk from 'chalk';

import { camelCase, trim, omit, isNil, isFunction, upperFirst } from 'lodash';

import { Configure } from '../core/configure';

import { CreateModule, isAsyncFn } from '../core/helpers';

import { CONTROLLER_DEPENDS, CRUD_OPTIONS_REGISTER } from './constants';
import { registerCrud } from './crud';
import { Restful } from './restful';
import { ApiDocOption, ApiRouteOption, CrudMethodOption } from './types';

/**
 * 路由路径前缀处理
 * @param routePath
 * @param addPrefix
 */
export const trimPath = (routePath: string, addPrefix = true) =>
    `${addPrefix ? '/' : ''}${trim(routePath.replace('//', '/'), '/')}`;

/**
 * 遍历路由及其子孙路由以清理路径前缀
 * @param data
 */
export const getCleanRoutes = (data: ApiRouteOption[]): ApiRouteOption[] =>
    data.map((option) => {
        const route: ApiRouteOption = {
            ...omit(option, 'children'),
            path: trimPath(option.path),
        };
        if (option.children && option.children.length > 0) {
            route.children = getCleanRoutes(option.children);
        } else {
            delete route.children;
        }
        return route;
    });

/**
 * 构建路由模块
 * @param configure
 * @param modules
 * @param routes
 * @param parentModule
 */
export const createRouteModuleTree = (
    configure: Configure,
    modules: { [key: string]: Type<any> },
    routes: ApiRouteOption[],
    parentModule?: string,
): Promise<Routes> =>
    Promise.all(
        routes.map(async ({ name, path, children, controllers, doc }) => {
            // 自动创建路由模块的名称
            const moduleName = parentModule ? `${parentModule}.${name}` : name;
            // RouteModule的名称必须唯一
            if (Object.keys(modules).includes(moduleName)) {
                throw new Error('route name should be unique in same level!');
            }
            // 获取每个控制器的依赖模块
            const depends = controllers
                .map((c) => Reflect.getMetadata(CONTROLLER_DEPENDS, c) || [])
                .reduce((o: Type<any>[], n) => {
                    if (o.find((i) => i === n)) return o;
                    return [...o, ...n];
                }, []);
            for (const controller of controllers) {
                const crudRegister = Reflect.getMetadata(CRUD_OPTIONS_REGISTER, controller);
                if (!isNil(crudRegister) && isFunction(crudRegister)) {
                    const curdOptions = isAsyncFn(crudRegister)
                        ? await crudRegister(configure)
                        : crudRegister(children);
                    registerCrud(controller, curdOptions);
                }
            }
            // 为每个没有自己添加’ApiTags‘ 装饰器的控制器添加Tag
            if (doc?.tags && doc.tags.length > 0) {
                controllers.forEach((controller) => {
                    !Reflect.getMetadata('swagger/apiUseTags', controller) &&
                        ApiTags(
                            ...doc.tags.map((tag) => (typeof tag === 'string' ? tag : tag.name)),
                        );
                });
            }
            // 创建路由模块，并导入所以控制器的依赖模块
            const module = CreateModule(`${upperFirst(camelCase(name))}RouteModule`, () => ({
                controllers,
                imports: depends,
            }));

            // 在module变量中追加创建的RouteModele，防止重名
            modules[moduleName] = module;
            const route: RouteTree = { path, module };
            if (children)
                route.children = await createRouteModuleTree(
                    configure,
                    modules,
                    children,
                    moduleName,
                );
            return route;
        }),
    );

/**
 * 生成最终路由路径
 * @param routePath
 * @param prefix
 * @param version
 */
export const genRoutePath = (routePath: string, prefix?: string, version?: string) =>
    trimPath(`${routePath}${version ? `/${version.toLowerCase()}/` : '/'}${routePath}`);

/**
 * 生成最终文档路径
 * @param routePath
 * @param prefix
 * @param version
 */
export const genDocPath = (routePath: string, prefix?: string, version?: string) =>
    trimPath(`${prefix}${version ? `/${version.toLowerCase()}/` : '/'}${routePath}`, false);

/**
 * 根据生成配置打印API的URL
 * @param configure
 * @param restful
 */
export async function echoApi(configure: Configure, restful: Restful) {
    const appUrl = await configure.get<string>('app.url');
    const apiUrl = await configure.get<string>('app.api');
    console.log(`- ApiUrl: ${chalk.green.underline(apiUrl)}`);
    console.log('- ApiDocs:');
    const { default: defaultDoc, ...docs } = restful.docs;
    echoDocs('default', defaultDoc, appUrl);
    for (const [name, doc] of Object.entries(docs)) {
        console.log();
        echoDocs(name, doc, appUrl);
    }
}

/**
 * 根据生成配置打印Doc的URL
 * @param name
 * @param doc
 * @param appUrl
 */
function echoDocs(name: string, doc: ApiDocOption, appUrl: string) {
    const getDocPath = (dpath: string) => `${appUrl}/${dpath}`;
    if (!doc.routes && doc.default) {
        console.log(
            `    [${chalk.blue(name.toUpperCase())}]: ${chalk.green.underline(
                getDocPath(doc.default.path),
            )}`,
        );
        return;
    }
    console.log(`    [${chalk.blue(name.toUpperCase())}]:`);
    if (doc.default) {
        console.log(`      default: ${chalk.green.underline(getDocPath(doc.default.path))}`);
    }
    if (doc.routes) {
        Object.entries(doc.routes).forEach(([_routeName, rdocs]) => {
            console.log(
                `      <${chalk.yellowBright.bold(rdocs.title)}>: ${chalk.green.underline(
                    getDocPath(rdocs.path),
                )}`,
            );
        });
    }
}

/**
 * 常用crud的hook配置生成
 * @param summary
 */
export function createHookOption(summary?: string): CrudMethodOption {
    return {
        hook: (target, method) => {
            if (!isNil(summary))
                ApiOperation({ summary })(
                    target,
                    method,
                    Object.getOwnPropertyDescriptor(target.prototype, method),
                );
        },
    };
}
