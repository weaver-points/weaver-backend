import {Injectable} from "@nestjs/common";
import {CustomMetric} from "../entities/custom-metric.entity";
@Injectable()
export class MetricCalculatorService{
    async calculate(metric:CustomMetric,data:any[]):Promise<number>{
        if(metric.formula==="COUNT"){
            return data.length;
        }
        if(metric.formula.startsWith('SUM:')){
            const field=metric.formula.split(':')[1];
            return data.reduce((acc,item)=>acc+(item[field]||0),0);
        }
        throw new Error(`Unsupported formula: ${metric.formula}`);
    }
}