// 核心模块

import { Configure } from './configure';
import { ModuleBuilder } from './decorators/module-builder.decorator';

@ModuleBuilder(async (configure) => ({
    global: true,
    providers: [
        {
            provide: Configure,
            useValue: configure,
        },
    ],
    exports: [Configure],
}))
export class CoreModule {}
