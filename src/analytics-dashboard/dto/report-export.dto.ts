import {IsIn} from 'class-validator';
export class ReportExportDto {
    @IsIn(['pdf','excel','csv'])
    format:'pdf'|'excel'|'csv';
    // Additional fields like date range, metrics to include can be added here
}