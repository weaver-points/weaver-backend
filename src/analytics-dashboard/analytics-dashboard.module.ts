import {Module} from '@nestjs/common';
import {AnalyticsDashboardController} from './controllers/analytics-dashboard.controller';
import {MetricCalculatorService} from './services/metric-calculator.service';
import {ReportGeneratorService} from './services/report-generator.service';
@Module({
    controllers:[AnalyticsDashboardController],
    providers:[MetricCalculatorService,ReportGeneratorService],
    exports:[MetricCalculatorService,ReportGeneratorService],
})
export class AnalyticsDashboardModule {}