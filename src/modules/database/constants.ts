export const CUSTOM_REPOSITORY_METADATA = 'CUSTOM_REPOSITORY_METADATA';

/**
 * 软删除数据查询类型
 * ALL: 包含已软删除和未软删除的数据（同时查询正常数据和回收站中的数据）
 * ONLY: 只包含软删除的数据 （只查询回收站中的数据）
 * NONE: 只包含未软删除的数据 （只查询正常数据）
 */
export enum SelectTrashMode {
    ALL = 'all',
    ONLY = 'only',
    NONE = 'none',
}

/**
 * 排序方式
 */
export enum OrderType {
    ASC = 'ASC',
    DESC = 'DESC',
}

/**
 * 树形模型在删除父级后子级的处理方式
 * DELETE: 在删除父节点时同时删除它的子孙节点
 * UP: 在删除父节点时把它的子孙节点提升一级
 * ROOT: 在删除父节点时把它的子节点提升为顶级节点
 */
export enum TreeChildrenResolve {
    DELETE = 'delete',
    UP = 'up',
    ROOT = 'root',
}
