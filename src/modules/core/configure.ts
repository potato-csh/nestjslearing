import { readFileSync, writeFileSync } from 'fs';
import * as fs from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';
import * as findUp from 'find-up';

import { ensureFileSync } from 'fs-extra';
import { get, has, isFunction, isNil, omit, set } from 'lodash';
import * as YAML from 'yaml';

import { EnvironmentType } from './constants';
import { deepMerge, isAsyncFn } from './helpers';
import { ConfigStorageOption, ConfigureFactory, ConfigureRegister } from './types';
/**
 * 核心配置类
 */
export class Configure {
    // ================================================= 属性 start =================================================
    /**
     * 配置是否被初始化, 防止二次初始化
     */
    protected inited = false;

    /**
     * 存储配置构造器的键值对列表
     */
    protected factories: Record<string, ConfigureFactory<Record<string, any>>> = {};

    /**
     * 存储生成的配置
     */
    protected config: Record<string, any> = {};

    /**
     * 存储yaml文件动态存储的配置
     */
    protected yamlConfig: Record<string, any> = {};

    /**
     * 确定是否开启yaml动态配置存储功能
     */
    protected storage = false;

    /**
     * 设置yaml文件的路径, 默认从根目录的config.yaml
     */
    protected yamlPath = path.resolve(__dirname, '../../..', 'config.yml');
    // ================================================= 属性 end =================================================

    constructor() {
        this.setRunEnv();
        this.loadEnvs();
    }

    // ================================================= 初始化 start =================================================
    /**
     * 根据选项初始化配置类
     * @param option
     */
    init(option: ConfigStorageOption = {}) {
        if (this.inited) return this;
        const { storage, yamlPath } = option;
        if (!isNil(storage)) this.storage = storage;
        if (!isNil(yamlPath)) this.yamlPath = yamlPath;
        if (this.storage) this.enabledStorage();
        this.inited = true;
        return this;
    }

    /**
     * 启用动态配置
     */
    protected enabledStorage() {
        this.storage = true;

        ensureFileSync(this.yamlPath);
        const yamlConfig = YAML.parse(readFileSync(this.yamlPath, 'utf-8'));
        this.yamlConfig = isNil(yamlConfig) ? {} : yamlConfig;
        this.config = deepMerge(this.config, this.yamlConfig, 'replace');
    }
    // ================================================= 初始化 end =================================================

    // ================================================= 环境变量 start =================================================
    /**
     * env用于获取环境变量，这是一个重载函数。
     * 当没有参数传入时获取所有环境变量；
     * 当传入一个参数时获取该参数对应的环境变量；
     * 当传入两个参数且第二参数转译函数时则对获取的环境变量进行类型转译；
     * 当传入两个参数且第二个参数不是函数时，则第二个参数为此环境不存在时的默认值；
     * 当传入三个参数时，则第一个为环境变量的键名，第二个为类型转译函数，第三个为默认值
     */
    /**
     * 获取全部环境变量
     */
    env(): { [key: string]: string };

    /**
     * 直接获取环境变量
     * @param key
     */
    env<T extends BaseType = string>(key: string): T;

    /**
     * 获取类型转义后的环境变量
     * @param key
     * @param parseTo 类型转义函数
     */
    env<T extends BaseType = string>(key: string, parseTo: ParseType<T>): T;

    /**
     * 获取环境变量,不存在则获取默认值
     * @param key
     * @param defaultValue 默认值
     */
    env<T extends BaseType = string>(key: string, defaultValue: T): T;

    /**
     * 获取类型转义后的环境变量,不存在则获取默认值
     * @param key
     * @param parseTo 类型转义函数
     * @param defaultValue 默认值
     */
    env<T extends BaseType = string>(key: string, parseTo: ParseType<T>, defaultValue: T): T;

    /**
     * 获取环境变量
     * @param key
     * @param parseTo 类型转义函数
     * @param defaultValue 默认值
     */
    env<T extends BaseType = string>(key?: string, parseTo?: ParseType<T> | T, defaultValue?: T) {
        if (!key) return process.env;
        const value = process.env[key];
        if (value !== undefined) {
            if (parseTo && isFunction(parseTo)) {
                const parseFunction = parseTo as ParseType<T>;
                return parseFunction(value);
            }
            return value as T;
        }
        if (parseTo === undefined && defaultValue === undefined) {
            return undefined;
        }
        if (parseTo && defaultValue === undefined) {
            return isFunction(parseTo) ? undefined : parseTo;
        }
        return defaultValue! as T;
    }

    /**
     * 设置运行环境的值
     */
    setRunEnv() {
        if (
            isNil(process.env.NODE_ENV) ||
            !Object.values(EnvironmentType).includes(process.env.NODE_ENV as EnvironmentType)
        ) {
            process.env.NODE_ENV = EnvironmentType.PRODUCTION;
        }
    }

    /**
     *
     * 获取当前运行环境的值
     */
    getRunEnv(): EnvironmentType {
        return process.env.NODE_ENV as EnvironmentType;
    }

    /**
     * 加载环境变量文件并合并到process.env中
     * 读取步骤为先读取proccess.env中的所有环境变量，
     * 然后读取.env中的环境变量（如果通过find-up向上查找能找到.env文件的话），
     * 加载.env中的环境变量并覆盖合并process.env，
     * 接着再读取.env.{运行环境}（比如.env.development）中的环境变量（如果通过find-up向上查找能找到该文件的话），
     * 加载该文件中的环境变量并覆盖合合并process.env，得到最终的process.env。
     * 此方法在初始化配置类实例时运行（setRunEnv之后）
     */
    protected loadEnvs() {
        if (!process.env) {
            process.env.NODE_ENV = EnvironmentType.PRODUCTION;
        }
        const search = [findUp.sync(['.env'])];
        if ((process.env.NODE_ENV as EnvironmentType) !== EnvironmentType.PRODUCTION) {
            search.push(findUp.sync([`.env.${process.env.NODE_ENV}`]));
        }
        const envFiles = search.filter((file) => file !== undefined) as string[];
        // 所以文件中配置的环境变量
        const fileEnvs = envFiles
            .map((filePath) => dotenv.parse(fs.readFileSync(filePath)))
            .reduce((oc, nc) => ({ ...oc, ...nc }), {});
        // 与系统环境变量合并后赋值给一个常量
        const envs = { ...process.env, ...fileEnvs };
        // 过滤掉envs中存在而process.env不存在的值
        const keys = Object.keys(envs).filter((key) => !(key in process.env));
        // 把.env*中存在而系统环境变量中不存在的值追加到process.env中
        keys.forEach((key) => {
            process.env[key] = envs[key];
        });
    }
    // ================================================= 环境变量 end =================================================

    // ================================================= 配置构造器 start =================================================
    /**
     * 同步配置构造器
     * 配置构造器通过add方法来添加，添加后放入factories属性，并通过syncFactory方法同步到config中（如果该构造器开启了storage则同时存储到yaml配置中并同步到ymlConfig属性中）
     * @param key
     */
    protected async syncFactory(key: string) {
        if (has(this.config, key)) return this;
        const { register, defaultRegister, storage, hook, append } = this.factories[key];
        let defaultValue = {};
        let value = isAsyncFn(register) ? await register(this) : register(this);
        if (!isNil(defaultRegister)) {
            defaultValue = isAsyncFn(defaultRegister)
                ? await defaultRegister(this)
                : defaultRegister(this);
            value = deepMerge(defaultValue, value, 'replace');
        }
        if (!isNil(hook)) {
            isAsyncFn(hook) ? await hook(this, value) : hook(this, value);
        }

        this.set(key, value, storage && isNil(await this.get(key, null)), append);
        return this;
    }

    // 配置类拥有对配置的一整套CRUD操作方法
    /**
     * 获取已存在的配置
     */
    all() {
        return this.config;
    }

    /**
     * 判断配置是否存在
     * @param key
     */
    has(key: string) {
        return has(this.config, key);
    }

    /**
     * 获取某个配置
     * 它可以传入一个默认配置，当配置不存时则返回默认配置。
     * 另外如果该配置不存在，且没有默认值，但是在配置构造器列表属性中其存在，则先去同步该构造器生成这个配置后获取。
     * @param key
     * @param defaultValue
     */
    async get<T>(key: string, defaultValue?: T): Promise<T> {
        if (!has(this.config, key) && defaultValue === undefined && has(this.factories, key)) {
            await this.syncFactory(key);
            return this.get(key, defaultValue);
        }
        return get(this.config, key, defaultValue) as T;
    }

    /**
     * 更新和设置一个配置，
     * 当storage为true时则存储到动态配置的yaml文件（如果追加模式则合并到原配置，如果是替换模式则替换掉原配置）并同步到ymlConfig以及config属性，
     * 如果storage为false则直接设置配置
     * @param key
     * @param value
     * @param storage
     * @param append
     */
    set<T>(key: string, value: T, storage = false, append = false) {
        if (storage && this.storage) {
            ensureFileSync(this.yamlPath);
            set(this.yamlConfig, key, value);
            writeFileSync(this.yamlPath, JSON.stringify(this.yamlConfig, null, 4));
            this.config = deepMerge(this.config, this.yamlConfig, append ? 'merge' : 'replace');
        } else {
            set(this.config, key, value);
        }
    }

    /**
     * 添加一个新配置集
     * @param key
     * @param register 配置构造器
     */
    add<T extends Record<string, any>>(
        key: string,
        register: ConfigureRegister<T> | ConfigureFactory<T>,
    ) {
        if (!isFunction(register) && 'register' in register) {
            this.factories[key] = register as any;
        } else if (isFunction(register)) {
            this.factories[key] = { register } as ConfigureFactory<T>;
        }
        return this;
    }

    /**
     * 删除配置项
     * @param key
     */
    remove(key: string) {
        if (this.storage && has(this.yamlConfig, key)) {
            this.yamlConfig = omit(this.yamlConfig, [key]);
            if (has(this.config, key)) this.config = omit(this.config, [key]);
            writeFileSync(this.yamlPath, JSON.stringify(this.yamlConfig, null, 4));
            this.config = deepMerge(this.config, this.yamlConfig, 'replace');
        } else if (has(this.config, key)) {
            this.config = omit(this.config, [key]);
        }
        return this;
    }

    /**
     * 手动存储一个配置到动态yaml配置并同步到ymlConfig属性，必须确保此配置已经存在于config属性
     * @param key
     */
    store(key: string) {
        if (!this.storage) throw new Error('Must enable storage at first!');
        ensureFileSync(this.yamlPath);
        set(this.yamlConfig, key, this.get(key, null));
        writeFileSync(this.yamlPath, JSON.stringify(this.yamlConfig, null, 4));
        this.config = deepMerge(this.config, this.yamlConfig, 'replace');
        return this;
    }

    /**
     * 同步配置
     * 添加一个配置构造器后需用使用此方法同步到配置中
     */
    async sync(name?: string) {
        if (!isNil(name)) await this.syncFactory(name);
        else {
            for (const key in this.factories) {
                await this.syncFactory(key);
            }
        }
    }
    // ================================================= 配置构造器 end =================================================
}
