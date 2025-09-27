"""
Reports & Exports Analytics API Endpoints

Provides custom report generation in multiple formats (JSON, PDF, Excel)
with scheduling, email delivery, and template management capabilities.
"""

from datetime import date, timedelta, datetime
from typing import Dict, List, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case, extract, text
import logging
import json
import pandas as pd
import io
import base64
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import tempfile
import os
from decimal import Decimal

from app.core.database import get_analytics_db, get_warehouse_db
from app.services.analytics_service import AnalyticsService
from app.models.analytics_models import DataGranularity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["reports-exports"])


@router.get("/reports")
async def get_available_reports(
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get list of available report templates and configurations
    """
    try:
        # Get available report templates
        report_templates_query = text("""
            SELECT 
                r.template_id,
                r.template_name,
                r.template_description,
                r.report_category,
                r.data_sources,
                r.default_format,
                r.supported_formats,
                r.parameters_schema,
                r.created_date,
                r.last_updated,
                r.is_active,
                COUNT(g.generation_id) as total_generations
            FROM report_templates r
            LEFT JOIN report_generations g ON r.template_id = g.template_id
            WHERE r.is_active = TRUE
            GROUP BY r.template_id, r.template_name, r.template_description, 
                     r.report_category, r.data_sources, r.default_format,
                     r.supported_formats, r.parameters_schema, r.created_date, 
                     r.last_updated, r.is_active
            ORDER BY r.report_category, r.template_name
        """)
        
        templates_result = await warehouse_db.execute(report_templates_query)
        templates_data = templates_result.fetchall()
        
        # Get recent report generations
        recent_reports_query = text("""
            SELECT 
                g.generation_id,
                g.template_id,
                rt.template_name,
                g.report_format,
                g.generation_status,
                g.file_size_bytes,
                g.generation_time_seconds,
                g.parameters_used,
                g.created_date,
                g.scheduled_delivery,
                g.download_count
            FROM report_generations g
            JOIN report_templates rt ON g.template_id = rt.template_id
            WHERE g.created_date >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY g.created_date DESC
            LIMIT 50
        """)
        
        recent_result = await warehouse_db.execute(recent_reports_query)
        recent_data = recent_result.fetchall()
        
        # Format templates data
        templates = []
        for row in templates_data:
            templates.append({
                "template_id": row.template_id,
                "template_name": row.template_name,
                "template_description": row.template_description,
                "report_category": row.report_category,
                "data_sources": json.loads(row.data_sources) if row.data_sources else [],
                "format_options": {
                    "default_format": row.default_format,
                    "supported_formats": json.loads(row.supported_formats) if row.supported_formats else []
                },
                "parameters_schema": json.loads(row.parameters_schema) if row.parameters_schema else {},
                "usage_statistics": {
                    "total_generations": int(row.total_generations or 0),
                    "created_date": row.created_date.isoformat() if row.created_date else None,
                    "last_updated": row.last_updated.isoformat() if row.last_updated else None
                }
            })
        
        # Format recent reports data
        recent_reports = []
        for row in recent_data:
            recent_reports.append({
                "generation_id": row.generation_id,
                "template_info": {
                    "template_id": row.template_id,
                    "template_name": row.template_name,
                    "report_format": row.report_format
                },
                "status_info": {
                    "generation_status": row.generation_status,
                    "generation_time_seconds": float(row.generation_time_seconds or 0),
                    "file_size_bytes": int(row.file_size_bytes or 0)
                },
                "parameters_used": json.loads(row.parameters_used) if row.parameters_used else {},
                "delivery_info": {
                    "created_date": row.created_date.isoformat() if row.created_date else None,
                    "scheduled_delivery": row.scheduled_delivery,
                    "download_count": int(row.download_count or 0)
                }
            })
        
        return {
            "success": True,
            "data": {
                "available_templates": templates,
                "recent_reports": recent_reports,
                "summary": {
                    "total_templates": len(templates),
                    "active_categories": len(set(t['report_category'] for t in templates)),
                    "recent_generations": len(recent_reports)
                }
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error in get available reports: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve available reports: {str(e)}"
        )


@router.post("/reports/generate")
async def generate_custom_report(
    template_id: str = Query(..., description="Report template ID"),
    format: str = Query("json", description="Output format (json/pdf/excel)"),
    days: int = Query(30, description="Number of days to include in report", ge=1, le=365),
    filters: Optional[str] = Query(None, description="JSON string of additional filters"),
    include_charts: bool = Query(False, description="Include charts in PDF/Excel reports"),
    background_tasks: BackgroundTasks,
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Union[Dict[str, Any], FileResponse]:
    """
    Generate a custom analytics report in the specified format
    
    Supports formats:
    - json: Structured JSON data
    - pdf: Formatted PDF report with tables and optional charts
    - excel: Excel spreadsheet with multiple sheets
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Parse additional filters
        additional_filters = {}
        if filters:
            try:
                additional_filters = json.loads(filters)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid filters JSON format")
        
        # Get report template configuration
        template_query = text("""
            SELECT 
                template_name,
                template_description,
                report_category,
                data_sources,
                query_template,
                parameters_schema
            FROM report_templates 
            WHERE template_id = :template_id AND is_active = TRUE
        """)
        
        template_result = await warehouse_db.execute(template_query, {"template_id": template_id})
        template_row = template_result.fetchone()
        
        if not template_row:
            raise HTTPException(status_code=404, detail="Report template not found")
        
        # Build parameters for the report query
        query_params = {
            'start_date': start_date,
            'end_date': end_date,
            'template_id': template_id
        }
        query_params.update(additional_filters)
        
        # Execute the report data query based on template
        data_sources = json.loads(template_row.data_sources) if template_row.data_sources else []
        report_data = {}
        
        for source in data_sources:
            source_name = source['name']
            source_query = source['query']
            
            # Replace template variables in query
            formatted_query = source_query.replace('{start_date}', ':start_date').replace('{end_date}', ':end_date')
            
            source_result = await warehouse_db.execute(text(formatted_query), query_params)
            source_data = source_result.fetchall()
            
            # Convert to list of dictionaries
            report_data[source_name] = [
                {column: value for column, value in row._asdict().items()}
                for row in source_data
            ]
        
        # Generate report based on format
        if format.lower() == 'json':
            return await _generate_json_report(
                template_row, report_data, start_date, end_date, additional_filters, background_tasks, warehouse_db
            )
        elif format.lower() == 'pdf':
            return await _generate_pdf_report(
                template_row, report_data, start_date, end_date, include_charts, background_tasks, warehouse_db
            )
        elif format.lower() == 'excel':
            return await _generate_excel_report(
                template_row, report_data, start_date, end_date, include_charts, background_tasks, warehouse_db
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Use json, pdf, or excel")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating custom report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate report: {str(e)}"
        )


async def _generate_json_report(
    template_row, report_data, start_date, end_date, additional_filters, background_tasks, warehouse_db
) -> Dict[str, Any]:
    """Generate JSON format report"""
    
    # Calculate summary statistics
    summary_stats = {}
    for source_name, data in report_data.items():
        if data:
            # Try to calculate basic statistics for numeric columns
            df = pd.DataFrame(data)
            numeric_columns = df.select_dtypes(include=['number']).columns
            
            summary_stats[source_name] = {
                "total_records": len(data),
                "numeric_summaries": {}
            }
            
            for col in numeric_columns:
                summary_stats[source_name]["numeric_summaries"][col] = {
                    "sum": float(df[col].sum()),
                    "avg": float(df[col].mean()),
                    "min": float(df[col].min()),
                    "max": float(df[col].max()),
                    "std": float(df[col].std()) if len(df) > 1 else 0
                }
    
    # Log report generation in background
    background_tasks.add_task(
        _log_report_generation,
        template_row.template_name,
        'json',
        len(str(report_data).encode()),
        warehouse_db
    )
    
    return {
        "success": True,
        "report_metadata": {
            "template_name": template_row.template_name,
            "template_description": template_row.template_description,
            "report_category": template_row.report_category,
            "format": "json",
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "filters_applied": additional_filters,
            "generated_at": datetime.utcnow().isoformat()
        },
        "summary_statistics": summary_stats,
        "data": report_data
    }


async def _generate_pdf_report(
    template_row, report_data, start_date, end_date, include_charts, background_tasks, warehouse_db
) -> FileResponse:
    """Generate PDF format report"""
    
    # Create temporary file for PDF
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    temp_filename = temp_file.name
    temp_file.close()
    
    try:
        # Create PDF document
        doc = SimpleDocTemplate(temp_filename, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title page
        title = Paragraph(f"<b>{template_row.template_name}</b>", styles['Title'])
        story.append(title)
        story.append(Spacer(1, 12))
        
        # Report metadata
        metadata_text = f"""
        <b>Report Description:</b> {template_row.template_description}<br/>
        <b>Report Category:</b> {template_row.report_category}<br/>
        <b>Date Range:</b> {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}<br/>
        <b>Generated At:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}<br/>
        """
        metadata_para = Paragraph(metadata_text, styles['Normal'])
        story.append(metadata_para)
        story.append(Spacer(1, 20))
        
        # Add data tables
        for source_name, data in report_data.items():
            if data:
                # Section header
                section_header = Paragraph(f"<b>{source_name.replace('_', ' ').title()}</b>", styles['Heading2'])
                story.append(section_header)
                story.append(Spacer(1, 12))
                
                # Convert data to table
                df = pd.DataFrame(data)
                
                # Limit columns and rows for PDF readability
                max_cols = 8
                max_rows = 50
                
                if len(df.columns) > max_cols:
                    df = df.iloc[:, :max_cols]
                
                if len(df) > max_rows:
                    df = df.head(max_rows)
                
                # Create table data
                table_data = [df.columns.tolist()]
                for _, row in df.iterrows():
                    table_data.append([str(val)[:20] + "..." if len(str(val)) > 20 else str(val) for val in row])
                
                # Create and style table
                table = Table(table_data)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                story.append(table)
                story.append(Spacer(1, 20))
        
        # Build PDF
        doc.build(story)
        
        # Log report generation in background
        file_size = os.path.getsize(temp_filename)
        background_tasks.add_task(
            _log_report_generation,
            template_row.template_name,
            'pdf',
            file_size,
            warehouse_db
        )
        
        # Return file response
        return FileResponse(
            temp_filename,
            media_type='application/pdf',
            filename=f"{template_row.template_name.replace(' ', '_')}_{start_date}_{end_date}.pdf",
            background=BackgroundTasks([lambda: os.unlink(temp_filename)])
        )
    
    except Exception as e:
        # Clean up temp file on error
        if os.path.exists(temp_filename):
            os.unlink(temp_filename)
        raise e


async def _generate_excel_report(
    template_row, report_data, start_date, end_date, include_charts, background_tasks, warehouse_db
) -> FileResponse:
    """Generate Excel format report"""
    
    # Create temporary file for Excel
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
    temp_filename = temp_file.name
    temp_file.close()
    
    try:
        with pd.ExcelWriter(temp_filename, engine='openpyxl') as writer:
            # Summary sheet
            summary_data = {
                'Report Information': [
                    f'Template: {template_row.template_name}',
                    f'Description: {template_row.template_description}',
                    f'Category: {template_row.report_category}',
                    f'Date Range: {start_date} to {end_date}',
                    f'Generated At: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")}'
                ]
            }
            
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
            
            # Data sheets
            for source_name, data in report_data.items():
                if data:
                    df = pd.DataFrame(data)
                    
                    # Clean sheet name for Excel compatibility
                    sheet_name = source_name.replace('_', ' ')[:30]  # Excel sheet name limit
                    
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                    
                    # Auto-adjust column widths
                    worksheet = writer.sheets[sheet_name]
                    for column in df:
                        column_length = max(df[column].astype(str).map(len).max(), len(column))
                        col_letter = worksheet[f"{list(df.columns).index(column) + 1}1"].column_letter
                        worksheet.column_dimensions[col_letter].width = min(column_length + 2, 50)
        
        # Log report generation in background
        file_size = os.path.getsize(temp_filename)
        background_tasks.add_task(
            _log_report_generation,
            template_row.template_name,
            'excel',
            file_size,
            warehouse_db
        )
        
        # Return file response
        return FileResponse(
            temp_filename,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename=f"{template_row.template_name.replace(' ', '_')}_{start_date}_{end_date}.xlsx",
            background=BackgroundTasks([lambda: os.unlink(temp_filename)])
        )
    
    except Exception as e:
        # Clean up temp file on error
        if os.path.exists(temp_filename):
            os.unlink(temp_filename)
        raise e


async def _log_report_generation(template_name: str, format: str, file_size: int, warehouse_db: AsyncSession):
    """Log report generation for tracking and analytics"""
    try:
        log_query = text("""
            INSERT INTO report_generations 
            (template_name, report_format, file_size_bytes, generation_status, created_date)
            VALUES (:template_name, :format, :file_size, 'completed', :created_date)
        """)
        
        await warehouse_db.execute(log_query, {
            'template_name': template_name,
            'format': format,
            'file_size': file_size,
            'created_date': datetime.utcnow()
        })
        await warehouse_db.commit()
        
    except Exception as e:
        logger.error(f"Failed to log report generation: {str(e)}")


@router.get("/reports/{generation_id}/download")
async def download_report(
    generation_id: str,
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> FileResponse:
    """
    Download a previously generated report by generation ID
    """
    try:
        # Get report generation info
        report_query = text("""
            SELECT 
                g.generation_id,
                g.template_id,
                rt.template_name,
                g.report_format,
                g.file_path,
                g.generation_status,
                g.created_date
            FROM report_generations g
            JOIN report_templates rt ON g.template_id = rt.template_id
            WHERE g.generation_id = :generation_id
        """)
        
        report_result = await warehouse_db.execute(report_query, {"generation_id": generation_id})
        report_row = report_result.fetchone()
        
        if not report_row:
            raise HTTPException(status_code=404, detail="Report generation not found")
        
        if report_row.generation_status != 'completed':
            raise HTTPException(status_code=400, detail="Report generation not completed")
        
        if not os.path.exists(report_row.file_path):
            raise HTTPException(status_code=404, detail="Report file not found")
        
        # Update download count
        update_query = text("""
            UPDATE report_generations 
            SET download_count = COALESCE(download_count, 0) + 1,
                last_downloaded = :download_time
            WHERE generation_id = :generation_id
        """)
        
        await warehouse_db.execute(update_query, {
            "generation_id": generation_id,
            "download_time": datetime.utcnow()
        })
        await warehouse_db.commit()
        
        # Determine media type
        media_type_mapping = {
            'pdf': 'application/pdf',
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'json': 'application/json'
        }
        
        media_type = media_type_mapping.get(report_row.report_format, 'application/octet-stream')
        filename = f"{report_row.template_name}_{report_row.created_date.strftime('%Y%m%d')}.{report_row.report_format}"
        
        return FileResponse(
            report_row.file_path,
            media_type=media_type,
            filename=filename
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download report: {str(e)}"
        )


@router.post("/reports/schedule")
async def schedule_report_generation(
    template_id: str = Query(..., description="Report template ID"),
    schedule_type: str = Query(..., description="Schedule type (daily/weekly/monthly)"),
    format: str = Query("json", description="Output format"),
    email_recipients: Optional[str] = Query(None, description="Comma-separated email addresses"),
    parameters: Optional[str] = Query(None, description="JSON string of report parameters"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Schedule automatic report generation and delivery
    """
    try:
        # Parse parameters
        report_parameters = {}
        if parameters:
            try:
                report_parameters = json.loads(parameters)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid parameters JSON format")
        
        # Parse email recipients
        email_list = []
        if email_recipients:
            email_list = [email.strip() for email in email_recipients.split(',')]
        
        # Create scheduled report entry
        schedule_query = text("""
            INSERT INTO scheduled_reports 
            (template_id, schedule_type, report_format, email_recipients, 
             parameters, is_active, created_date, next_run_date)
            VALUES 
            (:template_id, :schedule_type, :format, :email_recipients,
             :parameters, TRUE, :created_date, :next_run_date)
            RETURNING schedule_id
        """)
        
        # Calculate next run date based on schedule type
        next_run_date = datetime.utcnow()
        if schedule_type == 'daily':
            next_run_date += timedelta(days=1)
        elif schedule_type == 'weekly':
            next_run_date += timedelta(weeks=1)
        elif schedule_type == 'monthly':
            next_run_date += timedelta(days=30)
        else:
            raise HTTPException(status_code=400, detail="Invalid schedule_type. Use daily, weekly, or monthly")
        
        result = await warehouse_db.execute(schedule_query, {
            'template_id': template_id,
            'schedule_type': schedule_type,
            'format': format,
            'email_recipients': json.dumps(email_list),
            'parameters': json.dumps(report_parameters),
            'created_date': datetime.utcnow(),
            'next_run_date': next_run_date
        })
        
        schedule_id = result.fetchone()[0]
        await warehouse_db.commit()
        
        return {
            "success": True,
            "data": {
                "schedule_id": schedule_id,
                "template_id": template_id,
                "schedule_type": schedule_type,
                "report_format": format,
                "email_recipients": email_list,
                "parameters": report_parameters,
                "next_run_date": next_run_date.isoformat(),
                "status": "active"
            },
            "message": f"Report scheduled successfully. Next generation: {next_run_date.strftime('%Y-%m-%d %H:%M:%S UTC')}",
            "generated_at": datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scheduling report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to schedule report: {str(e)}"
        )