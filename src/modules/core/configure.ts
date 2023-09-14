import { writeFileSync } from 'fs';
import path from 'path';

import { ensureFileSync, readFileSync } from 'fs-extra';
import { isNil, isFunction, has, get, set } from 'lodash';
import YAML from 'yaml';

import { EnviromentType } from './constants';
import { deepMerge, isAsyncFn } from './helpers';
import { ConfigStorageOption, ConfigureFactory, ConfigureRegister } from './types';

/**
 * 配置类
 */
export class Configure {
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
    protected yamlPath = path.resolve(__dirname, '../../..', 'config.yaml');

    constructor() {
        this.setRunEnv();
        this.loadEnvs();
    }

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
            this.factories[key] = { register };
        }
        return this;
    }

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

    remove(key: string) {}

    /**
     * env用于获取环境变量，这是一个重载函数。
     * 当没有参数传入时获取所有环境变量；
     * 当传入一个参数时获取该参数对应的环境变量；
     * 当传入两个参数且第二参数转译函数时则对获取的环境变量进行类型转译；
     * 当传入两个参数且第二个参数不是函数时，则第二个参数为此环境不存在时的默认值；
     * 当传入三个参数时，则第一个为环境变量的键名，第二个为类型转译函数，第三个为默认值
     */
    env(): { [key: string]: string };
    env<T extends BaseType = string>(key: string): T;
    env<T extends BaseType = string>(key: string, parseTo: ParseType<T>): T;
    env<T extends BaseType = string>(key: string, defaultValue: T): T;
    env<T extends BaseType = string>(key: string, parseTo: ParseType<T>, defaultValue: T);
    env<T extends BaseType = string>(key: string, parseTo?: ParseType<T> | T, defaultValue?: T) {
        if (!key) return process.env;
        const value = process.env[key];
        if (value !== undefined) {
            if (parseTo && isFunction(parseTo)) {
                return parseTo(value);
            }
            return value as T;
        }
        if (parseTo === undefined && defaultValue === undefined) return undefined;

        if (parseTo && defaultValue === undefined) {
            return isFunction(parseTo) ? undefined : parseTo;
        }
        return defaultValue! as T;
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

    /**
     * 设置运行环境的值
     */
    protected setRunEnv() {
        if (
            isNil(process.env.NODE_ENV) ||
            !Object.values(EnviromentType).includes(process.env.NODE_ENV as EnviromentType)
        ) {
            process.env.NODE_ENV = EnviromentType.PRODUCTION;
        }
    }

    /**
     *
     * 获取当前运行环境的值
     */
    protected getRunEnv(): EnviromentType {
        return process.env.NODE_ENV as EnviromentType;
    }

    /**
     * 同步配置构造器
     * 同步到config中（如果该构造器开启了storage则同时存储到yaml配置中并同步到ymlConfig属性中）
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
}
