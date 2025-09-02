import {Controller,Post,Get,Body,Param,Res} from '@nestjs/common';
import {CustomMetricDto} from '../dto/custom-metric.dto';
import {ReportExportDto} from '../dto/report-export.dto';
import {Response} from 'express';
import {MetricCalculatorService} from '../services/metric-calculator.service';
import {ReportGeneratorService} from '../services/report-generator.service';

@Controller('analytics-dashboard')
export class AnalyticsDashboardController {
    constructor(
        private readonly metricService: MetricCalculatorService,
        private readonly reportService: ReportGeneratorService,
    ) {}
    @Post('metric')
    createMetric(@Body() dot: CustomMetricDto){
        return {message:'Metric created',data:dot};
    }
    @Post('report/export')
    async exportReport(@Body() dto:ReportExportDto,@Res() res:Response){
        return this.reportService.generateReport(dto,res);
    }
    @Get('metric/:id')
        getMetric(@Param('id') id:string){
            return {id,value:Math.random()*100};
        }    
    }