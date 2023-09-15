import { Configure } from './configure';

/**
 * 配置类的yaml动态存储选项
 */
export interface ConfigStorageOption {
    /**
     * 是否开启动态存储
     */
    storage?: boolean;
    /**
     * yaml文件路径, 默认为src目录外的config.yaml
     */
    yamlPath?: string;
}

/**
 * 配置构造器函数，生成配置构造对象
 */
export interface ConfigureFactory<
    T extends Record<string, any>,
    C extends Record<string, any> = T,
> {
    /**
     * 配置注册器
     */
    register: ConfigureRegister<Partial<T>>;
    /**
     * 默认配置注册器
     */
    defaultRegister?: ConfigureRegister<T>;
    /**
     * 是否动态存储
     */
    storage?: boolean;

    hook?: (configure: Configure, value: T) => C | Promise<C>;
    /**
     * 深度合并时对数组采用追加模型, 默认为 false
     */
    append?: boolean;
}

/**
 * 配置注册器函数
 * 自定义配置注册器，使用配置构造对象生成最终配置时的自定义配置生成函数
 */
export type ConfigureRegister<T extends Record<string, any>> = (
    configure: Configure,
) => T | Promise<T>;
