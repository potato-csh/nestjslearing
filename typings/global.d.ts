/**
 * 类转义为普通对象后的类型
 */
declare type ClassToPlain<T> = { [key in keyof T]: T[key] };

/**
 * 一个类的类型
 */
declare type ClassType<T> = { new (...args: any[]): T };
