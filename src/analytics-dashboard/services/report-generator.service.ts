import {Injectable} from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import {ReportExportDto} from '../dto/report-export.dto';
import {createObjectCsvWriter} from 'csv-writer';
import {Response} from 'express';
import { rmSync } from 'fs';
@Injectable()
export class ReportGeneratorService{
    async generateReport(dto:ReportExportDto,res:Response){
        switch(dto.format){
            case 'pdf':
                const doc=new PDFDocument();
                res.setHeader('Content-Type','application/pdf');
                doc.text('Analytics Report');
                doc.pipe(res);
                doc.end();
                break;
            case 'excel':
                const workbook=new ExcelJS.Workbook();
                const sheet=workbook.addWorksheet('Report');
                sheet.addRow(['Metric','Value']);
                await workbook.xlsx.write(res);
                break;
            case 'csv':
                const csvWriter=createObjectCsvWriter({
                    path:'report.csv',
                    header:[{id:'metric',title:'Metric'},{id:'value',title:'Value'}]
                });
                await csvWriter.writeRecords([{metric:'Users',value:120}]);
                res.download('report.csv');
                break;
            default:
                throw new Error('Unsupported format');
        }
                }
        }