import { Type } from '@nestjs/common';
import { Routes } from '@nestjs/core';
import { pick } from 'lodash';

import { Configure } from '../core/configure';

import { getCleanRoutes } from './helpers';
import { ApiConfig } from './types';

/**
 * restful配置生成
 */
export abstract class RouterConfigure {
    constructor(protected configure: Configure) {}

    // ================================================= 属性 =================================================
    /**
     * API配置
     */
    protected config: ApiConfig;

    /**
     * 路由表
     */
    protected _routes: Routes = [];

    /**
     * 默认API版本号
     */
    protected _default!: string;

    /**
     * 启用的API版本
     */
    protected _versions: string[] = [];

    /**
     * 自动创建的RouteModule
     */
    protected _modules: { [key: string]: Type<any> } = {};

    get routes() {
        return this._routes;
    }

    get default() {
        return this._default;
    }

    get versions() {
        return this._versions;
    }

    get modules() {
        return this._modules;
    }

    /**
     * 创建配置
     * @param config
     */
    protected createConfig(config: ApiConfig) {
        if (!config.default) {
            throw new Error('default api version name should beed config!');
        }
        const versionMaps = Object.entries(config.versions)
            // 过滤启用版本
            .filter(([name]) => {
                if (config.default === name) return name;
                return config.enabled.includes(name);
            })
            // 合并版本配置与总配置
            .map(([name, version]) => [
                name,
                {
                    ...pick(config, ['title', 'describtion', 'auth']),
                    ...version,
                    tag: Array.from(new Set([...(config.tags ?? []), ...(version.tags ?? [])])),
                    routes: getCleanRoutes(version.routes ?? []),
                },
            ]);

        config.versions = Object.fromEntries(versionMaps);
        // 设置所有版本号
        this._versions = Object.keys(config.versions);
        // 设置默认版本号
        this._default = config.default;
        // 启用的版本必须包含默认版本
        if (!this._versions.includes(this._default)) {
            throw new Error(`Default api version named ${this._default} not exists!`);
        }
        this.config = config;
    }
}
