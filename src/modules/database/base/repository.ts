import { isNil } from 'lodash';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

import { OrderType } from '../constants';
import { getOrderByQuery } from '../types';

export abstract class BaseRepository<E extends ObjectLiteral> extends Repository<E> {
    /**
     * 构建QueryBuilder时默认的模型对应的查询名称
     */
    protected abstract _qbName: string;

    /**
     * 默认排序规则，可以通过每个方法的orderBy选项进行覆盖
     */
    protected orderBy?: string | { name: string; order: `${OrderType}` };

    /**
     * 返回查询器的名称
     */
    get qbName() {
        return this._qbName;
    }

    /**
     * 构建基础查询器
     */
    buildBaseQB(): SelectQueryBuilder<E> {
        return this.createQueryBuilder(this.qbName);
    }

    /**
     * 生成排序的QueryBuilder
     * @param qb
     * @param orderBy
     */
    addOrderByQuery(qb: SelectQueryBuilder<E>, orderBy?: OrderType) {
        const orderByQuery = orderBy ?? this.orderBy;
        return !isNil(orderBy) ? getOrderByQuery(qb, this.qbName, orderByQuery) : qb;
    }
}
