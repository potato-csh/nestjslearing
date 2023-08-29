import { Controller, Get, Inject } from '@nestjs/common';

import { FifthService } from '../services/fifth.service';
import { FirstService } from '../services/first.service';
import { FourthService } from '../services/fourth.service';
import { SecondService } from '../services/second.service';

@Controller('test')
export class TestController {
    constructor(
        private first: FirstService,
        @Inject('ID-EXAMPLE') private idExp: FirstService,
        @Inject('FACTORY-EXAMPLE') private ftExp: FourthService,
        @Inject('ALIAS-EXAMPLE') private asExp: FirstService,
        @Inject('ASYNC-EXAMPLE') private acExp: SecondService,
        private fifth: FifthService,
    ) {}

    @Get('value')
    async useValue() {
        console.log('value');
        return this.first.useValue(); // useValue提供者
    }

    @Get('id')
    async useId() {
        return this.idExp.useId(); // 字符串提供者
    }

    @Get('factory')
    async useFactory() {
        return this.ftExp.getContent(); // 构造器提供者2
    }

    @Get('alias')
    async useAlias() {
        return this.asExp.useAlias(); // 别名提供者
    }

    @Get('async')
    async useAsync() {
        return this.acExp.useAsync(); // 异步提供者
    }

    @Get('circular')
    async useCircular() {
        return this.fifth.circular();
    }
}
