import { ArgumentMetadata, Paramtype, ValidationPipe } from '@nestjs/common';
// import merge from 'deepmerge';
import * as merge from 'deepmerge';

import { DTO_VALIDATION_OPTIONS } from '../constants';

export class AppPipe extends ValidationPipe {
    async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
        const { metatype, type } = metadata;
        // 获取当前验证参数的dto
        const dto = metatype as any;
        // 通过metadata获取这个DTO类上的自定义验证选项
        const options = Reflect.getMetadata(DTO_VALIDATION_OPTIONS, dto) || {};
        // 把默认父类已经设置的验证选项给结构赋值给一个常量(备份)
        const originOptions = { ...this.validatorOptions };
        // 把父类已经设置的默认序列化选项赋值给一个常量(备份)
        const originTransform = { ...this.transformOptions };
        // 把自定义选项给结构出来，获取自定义的序列化和验证选项，以及当前DTO类需要验证的请求数据类型
        const { transformOptions, type: optionsType, ...customOptions } = options;
        // 如果没有自定义设置待验证的请求数据类型，则默认为验证body数据
        const requestType: Paramtype = optionsType ?? 'body';
        // 如果被验证的DTO设置的请求类型与被验证的数据的请求类型不是同一种类型则跳过此管道
        if (requestType !== type) return value;

        // 合并当前transform选项和自定义选项
        if (transformOptions) {
            this.transformOptions = merge(this.transformOptions, transformOptions ?? {}, {
                arrayMerge: (_d, s, _o) => s,
            });
        }
        // 合并当前验证选项和自定义选项
        this.validatorOptions = merge(this.validatorOptions, customOptions ?? {}, {
            arrayMerge: (_d, s, _o) => s,
        });

        // 设置待验证的值
        const toValidate = value;

        // 使用父类的transform方法进行验证并返回序列化后的值
        const result = await super.transform(toValidate, metadata);
        // 重置默认验证和序列化选项为前面我们通过常量存储的父类自带的选项
        this.validatorOptions = originOptions;
        this.transformOptions = originTransform;
        return result;
    }
}
