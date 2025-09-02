import {Entity,Column,PrimaryGeneratedColumn} from 'typeorm';
@Entity('custom_metric')
export class CustomMetric {
    @PrimaryGeneratedColumn('uuid')
    id:string;
    @Column()
    name:string;
    @Column({type:'text'})
    formula:string;
    @Column({default:true})
    isActive:boolean;
}