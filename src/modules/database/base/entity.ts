import { Expose } from 'class-transformer';
import { PrimaryGeneratedColumn, BaseEntity as TypeOrmBaseEntity } from 'typeorm';

export class BaseEntity extends TypeOrmBaseEntity {
    @Expose()
    @PrimaryGeneratedColumn('uuid')
    id: string;
}
