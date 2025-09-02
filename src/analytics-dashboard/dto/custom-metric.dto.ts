import {IsString,IsOptional,IsBoolean} from 'class-validator';
export class CustomMetricDto {
    @IsString()
    name:string;
    @IsString()
    formula:string;
    @IsOptional()
    @IsBoolean()
    isActive?:boolean;
}