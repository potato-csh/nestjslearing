import { Body, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { DeleteWithTrashDto } from '../dtos/delete-with-trash.dto';
import { ListWithTrashedQueryDto } from '../dtos/query.dto';
import { RestoreDto } from '../dtos/restore.dto';

/**
 * 带软删除验证的控制器
 */
export abstract class BaseControllerWithTrash<S> {
    protected service: S;

    constructor(service: S) {
        this.setService(service);
    }

    private setService(service: S) {
        this.service = service;
    }

    async list(@Query() options: ListWithTrashedQueryDto, ...args: any[]) {
        return (this.service as any).paginate(options);
    }

    async detail(
        @Param('id', new ParseUUIDPipe())
        item: string,
        ...args: any[]
    ) {
        return (this.service as any).detail(item);
    }

    async store(
        @Body()
        data: any,
        ...args: any[]
    ) {
        return (this.service as any).create(data);
    }

    async update(
        @Body()
        data: any,
        ...args: any[]
    ) {
        return (this.service as any).update(data);
    }

    async delete(
        @Body()
        { ids, trash }: DeleteWithTrashDto,
        ...args: any[]
    ) {
        return (this.service as any).delete(ids, trash);
    }

    async restore(
        @Body()
        { ids }: RestoreDto,
        ...args: any[]
    ) {
        return (this.service as any).restore(ids);
    }
}
