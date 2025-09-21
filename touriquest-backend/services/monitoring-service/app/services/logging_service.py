"""
Logging service with ELK stack integration for centralized log collection and analysis
"""

from typing import Dict, List, Optional, Any, Union, AsyncGenerator
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import json
import logging
import traceback
import sys
from pathlib import Path
import gzip
import aiofiles
from urllib.parse import urljoin

from elasticsearch import AsyncElasticsearch
from elasticsearch.exceptions import ElasticsearchException, NotFoundError
import logstash
from pythonjsonlogger import jsonlogger

from app.core.config import settings


# Configure structured logging
class StructuredFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter for structured logging"""
    
    def add_fields(self, log_record, record, message_dict):
        super(StructuredFormatter, self).add_fields(log_record, record, message_dict)
        
        # Add standard fields
        log_record['timestamp'] = datetime.utcnow().isoformat()
        log_record['service'] = settings.SERVICE_NAME
        log_record['environment'] = settings.SENTRY_ENVIRONMENT
        log_record['version'] = settings.APP_VERSION
        
        # Add trace context if available
        try:
            from opentelemetry import trace
            span = trace.get_current_span()
            if span and span.is_recording():
                span_context = span.get_span_context()
                log_record['trace_id'] = format(span_context.trace_id, '032x')
                log_record['span_id'] = format(span_context.span_id, '016x')
        except ImportError:
            pass
        
        # Ensure level is present
        if 'level' not in log_record:
            log_record['level'] = record.levelname


class LogLevel(str, Enum):
    """Log levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


@dataclass
class LogEntry:
    """Log entry structure"""
    timestamp: datetime
    level: LogLevel
    message: str
    service: str
    logger_name: str
    module: Optional[str] = None
    function: Optional[str] = None
    line_number: Optional[int] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    session_id: Optional[str] = None
    tags: Dict[str, str] = field(default_factory=dict)
    extra_fields: Dict[str, Any] = field(default_factory=dict)
    exception_info: Optional[Dict[str, str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Elasticsearch"""
        result = {
            "timestamp": self.timestamp.isoformat(),
            "level": self.level.value,
            "message": self.message,
            "service": self.service,
            "logger_name": self.logger_name,
            "tags": self.tags,
            "extra_fields": self.extra_fields
        }
        
        # Add optional fields if present
        optional_fields = [
            "module", "function", "line_number", "trace_id", "span_id",
            "user_id", "request_id", "session_id", "exception_info"
        ]
        
        for field_name in optional_fields:
            value = getattr(self, field_name)
            if value is not None:
                result[field_name] = value
        
        return result
    
    @classmethod
    def from_log_record(cls, record: logging.LogRecord) -> "LogEntry":
        """Create LogEntry from Python logging record"""
        # Extract exception info if present
        exception_info = None
        if record.exc_info:
            exception_info = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": "".join(traceback.format_exception(*record.exc_info))
            }
        
        # Extract trace context
        trace_id = getattr(record, "trace_id", None)
        span_id = getattr(record, "span_id", None)
        
        # Extract user context
        user_id = getattr(record, "user_id", None)
        request_id = getattr(record, "request_id", None)
        session_id = getattr(record, "session_id", None)
        
        # Extract tags and extra fields
        tags = getattr(record, "tags", {})
        extra_fields = {}
        
        # Add any custom fields from the record
        standard_fields = {
            "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
            "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
            "created", "msecs", "relativeCreated", "thread", "threadName",
            "processName", "process", "getMessage", "trace_id", "span_id",
            "user_id", "request_id", "session_id", "tags"
        }
        
        for key, value in record.__dict__.items():
            if key not in standard_fields and not key.startswith("_"):
                extra_fields[key] = value
        
        return cls(
            timestamp=datetime.fromtimestamp(record.created),
            level=LogLevel(record.levelname),
            message=record.getMessage(),
            service=settings.SERVICE_NAME,
            logger_name=record.name,
            module=record.module,
            function=record.funcName,
            line_number=record.lineno,
            trace_id=trace_id,
            span_id=span_id,
            user_id=user_id,
            request_id=request_id,
            session_id=session_id,
            tags=tags,
            extra_fields=extra_fields,
            exception_info=exception_info
        )


@dataclass
class LogQuery:
    """Log search query"""
    query: Optional[str] = None
    level: Optional[LogLevel] = None
    service: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    trace_id: Optional[str] = None
    user_id: Optional[str] = None
    tags: Dict[str, str] = field(default_factory=dict)
    limit: int = 100
    offset: int = 0
    sort_field: str = "timestamp"
    sort_order: str = "desc"  # desc or asc


class ElasticsearchHandler(logging.Handler):
    """Custom logging handler for Elasticsearch"""
    
    def __init__(self, es_client: AsyncElasticsearch, index_pattern: str = "logs"):
        super().__init__()
        self.es_client = es_client
        self.index_pattern = index_pattern
        self.buffer: List[Dict[str, Any]] = []
        self.buffer_size = 100
        self.flush_interval = 30  # seconds
        self._last_flush = datetime.utcnow()
        
    def emit(self, record: logging.LogRecord):
        """Emit a log record"""
        try:
            log_entry = LogEntry.from_log_record(record)
            doc = log_entry.to_dict()
            
            # Add to buffer
            self.buffer.append({
                "_index": f"{self.index_pattern}-{datetime.utcnow().strftime('%Y.%m.%d')}",
                "_source": doc
            })
            
            # Flush if buffer is full or time interval exceeded
            now = datetime.utcnow()
            if (len(self.buffer) >= self.buffer_size or 
                (now - self._last_flush).total_seconds() >= self.flush_interval):
                asyncio.create_task(self._flush_buffer())
                
        except Exception as e:
            self.handleError(record)
    
    async def _flush_buffer(self):
        """Flush buffer to Elasticsearch"""
        if not self.buffer:
            return
        
        try:
            docs = self.buffer.copy()
            self.buffer.clear()
            self._last_flush = datetime.utcnow()
            
            if docs:
                await self.es_client.bulk(
                    operations=[
                        {"index": {"_index": doc["_index"]}}
                        if "_index" in doc else {"index": {}},
                        doc["_source"]
                        for doc in docs
                        for _ in [None, None]  # Each doc needs index command + source
                    ][1::2],  # Take every second item (the source docs)
                    index=f"{self.index_pattern}-{datetime.utcnow().strftime('%Y.%m.%d')}",
                    refresh=False
                )
                
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to flush logs to Elasticsearch: {e}")


class LoggingService:
    """Centralized logging service with ELK integration"""
    
    def __init__(self):
        self.es_client: Optional[AsyncElasticsearch] = None
        self.logstash_handler: Optional[logstash.LogstashHandler] = None
        self.es_handler: Optional[ElasticsearchHandler] = None
        self.file_handlers: Dict[str, logging.FileHandler] = {}
        self.configured_loggers: Dict[str, logging.Logger] = {}
        self.log_buffer: List[LogEntry] = []
        self.buffer_size = 1000
        self._background_tasks: List[asyncio.Task] = []
        
    async def initialize(self) -> bool:
        """Initialize logging service"""
        try:
            # Initialize Elasticsearch client
            if settings.ELASTICSEARCH_URL:
                await self._init_elasticsearch()
            
            # Initialize Logstash handler
            if settings.LOGSTASH_HOST and settings.LOGSTASH_PORT:
                self._init_logstash()
            
            # Configure root logger
            self._configure_root_logger()
            
            # Setup log rotation
            self._setup_log_rotation()
            
            # Start background tasks
            self._start_background_tasks()
            
            logger = logging.getLogger(__name__)
            logger.info("Logging service initialized successfully")
            return True
            
        except Exception as e:
            print(f"Failed to initialize logging service: {e}")
            return False
    
    async def _init_elasticsearch(self) -> None:
        """Initialize Elasticsearch connection"""
        try:
            # Parse Elasticsearch URL
            es_config = {
                "hosts": [settings.ELASTICSEARCH_URL],
                "verify_certs": settings.ELASTICSEARCH_VERIFY_CERTS,
                "request_timeout": 30,
                "retry_on_timeout": True,
                "max_retries": 3
            }
            
            # Add authentication if configured
            if settings.ELASTICSEARCH_USERNAME and settings.ELASTICSEARCH_PASSWORD:
                es_config["http_auth"] = (
                    settings.ELASTICSEARCH_USERNAME,
                    settings.ELASTICSEARCH_PASSWORD
                )
            
            self.es_client = AsyncElasticsearch(**es_config)
            
            # Test connection
            await self.es_client.ping()
            
            # Create index template
            await self._create_log_index_template()
            
            # Setup Elasticsearch handler
            self.es_handler = ElasticsearchHandler(
                self.es_client,
                settings.ELASTICSEARCH_LOG_INDEX
            )
            
            logging.getLogger().addHandler(self.es_handler)
            
            print("Elasticsearch logging initialized")
            
        except Exception as e:
            print(f"Failed to initialize Elasticsearch: {e}")
            self.es_client = None
    
    async def _create_log_index_template(self) -> None:
        """Create Elasticsearch index template for logs"""
        template = {
            "index_patterns": [f"{settings.ELASTICSEARCH_LOG_INDEX}-*"],
            "template": {
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 1,
                    "index.refresh_interval": "5s",
                    "index.max_result_window": 50000
                },
                "mappings": {
                    "properties": {
                        "timestamp": {
                            "type": "date",
                            "format": "strict_date_optional_time||epoch_millis"
                        },
                        "level": {
                            "type": "keyword"
                        },
                        "message": {
                            "type": "text",
                            "analyzer": "standard",
                            "fields": {
                                "keyword": {
                                    "type": "keyword",
                                    "ignore_above": 256
                                }
                            }
                        },
                        "service": {
                            "type": "keyword"
                        },
                        "logger_name": {
                            "type": "keyword"
                        },
                        "module": {
                            "type": "keyword"
                        },
                        "function": {
                            "type": "keyword"
                        },
                        "line_number": {
                            "type": "integer"
                        },
                        "trace_id": {
                            "type": "keyword"
                        },
                        "span_id": {
                            "type": "keyword"
                        },
                        "user_id": {
                            "type": "keyword"
                        },
                        "request_id": {
                            "type": "keyword"
                        },
                        "session_id": {
                            "type": "keyword"
                        },
                        "tags": {
                            "type": "object",
                            "dynamic": True
                        },
                        "extra_fields": {
                            "type": "object",
                            "dynamic": True
                        },
                        "exception_info": {
                            "properties": {
                                "type": {
                                    "type": "keyword"
                                },
                                "message": {
                                    "type": "text"
                                },
                                "traceback": {
                                    "type": "text"
                                }
                            }
                        }
                    }
                }
            }
        }
        
        try:
            await self.es_client.indices.put_index_template(
                name=f"{settings.ELASTICSEARCH_LOG_INDEX}-template",
                body=template
            )
            print("Created Elasticsearch log index template")
            
        except Exception as e:
            print(f"Failed to create index template: {e}")
    
    def _init_logstash(self) -> None:
        """Initialize Logstash handler"""
        try:
            self.logstash_handler = logstash.TCPLogstashHandler(
                host=settings.LOGSTASH_HOST,
                port=settings.LOGSTASH_PORT,
                version=1
            )
            
            # Set formatter
            formatter = StructuredFormatter()
            self.logstash_handler.setFormatter(formatter)
            
            # Add to root logger
            logging.getLogger().addHandler(self.logstash_handler)
            
            print("Logstash logging initialized")
            
        except Exception as e:
            print(f"Failed to initialize Logstash: {e}")
            self.logstash_handler = None
    
    def _configure_root_logger(self) -> None:
        """Configure root logger with structured formatting"""
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
        
        # Remove existing handlers
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # Console handler with JSON formatting
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(StructuredFormatter())
        root_logger.addHandler(console_handler)
        
        # File handler for local storage
        if settings.LOG_FILE:
            file_handler = logging.FileHandler(settings.LOG_FILE)
            file_handler.setFormatter(StructuredFormatter())
            root_logger.addHandler(file_handler)
            self.file_handlers["main"] = file_handler
        
        # Re-add ELK handlers if available
        if self.es_handler:
            root_logger.addHandler(self.es_handler)
        if self.logstash_handler:
            root_logger.addHandler(self.logstash_handler)
    
    def _setup_log_rotation(self) -> None:
        """Setup log file rotation"""
        if settings.LOG_FILE and settings.LOG_ROTATION_ENABLED:
            from logging.handlers import RotatingFileHandler
            
            # Remove existing file handler
            if "main" in self.file_handlers:
                logging.getLogger().removeHandler(self.file_handlers["main"])
            
            # Add rotating file handler
            rotating_handler = RotatingFileHandler(
                filename=settings.LOG_FILE,
                maxBytes=settings.LOG_MAX_SIZE,
                backupCount=settings.LOG_BACKUP_COUNT
            )
            rotating_handler.setFormatter(StructuredFormatter())
            logging.getLogger().addHandler(rotating_handler)
            self.file_handlers["main"] = rotating_handler
    
    def _start_background_tasks(self) -> None:
        """Start background tasks"""
        # Log buffer flush task
        flush_task = asyncio.create_task(self._flush_log_buffer())
        self._background_tasks.append(flush_task)
        
        # Log cleanup task
        cleanup_task = asyncio.create_task(self._cleanup_old_logs())
        self._background_tasks.append(cleanup_task)
    
    async def _flush_log_buffer(self) -> None:
        """Flush log buffer to Elasticsearch periodically"""
        while True:
            try:
                await asyncio.sleep(30)  # Flush every 30 seconds
                
                if self.log_buffer and self.es_client:
                    logs_to_flush = self.log_buffer.copy()
                    self.log_buffer.clear()
                    
                    # Prepare bulk operations
                    operations = []
                    for log_entry in logs_to_flush:
                        index_name = f"{settings.ELASTICSEARCH_LOG_INDEX}-{log_entry.timestamp.strftime('%Y.%m.%d')}"
                        operations.extend([
                            {"index": {"_index": index_name}},
                            log_entry.to_dict()
                        ])
                    
                    if operations:
                        await self.es_client.bulk(operations=operations, refresh=False)
                        print(f"Flushed {len(logs_to_flush)} log entries to Elasticsearch")
                
            except Exception as e:
                logging.getLogger(__name__).error(f"Error flushing log buffer: {e}")
                await asyncio.sleep(60)
    
    async def _cleanup_old_logs(self) -> None:
        """Clean up old log indices"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                
                if not self.es_client or not settings.LOG_RETENTION_DAYS:
                    continue
                
                cutoff_date = datetime.utcnow() - timedelta(days=settings.LOG_RETENTION_DAYS)
                cutoff_index = f"{settings.ELASTICSEARCH_LOG_INDEX}-{cutoff_date.strftime('%Y.%m.%d')}"
                
                # Get all log indices
                try:
                    indices = await self.es_client.indices.get(
                        index=f"{settings.ELASTICSEARCH_LOG_INDEX}-*"
                    )
                    
                    indices_to_delete = []
                    for index_name in indices.keys():
                        if index_name < cutoff_index:
                            indices_to_delete.append(index_name)
                    
                    # Delete old indices
                    for index_name in indices_to_delete:
                        await self.es_client.indices.delete(index=index_name)
                        print(f"Deleted old log index: {index_name}")
                        
                except NotFoundError:
                    # No indices to clean up
                    pass
                
            except Exception as e:
                logging.getLogger(__name__).error(f"Error cleaning up old logs: {e}")
                await asyncio.sleep(3600)
    
    async def search_logs(self, query: LogQuery) -> Dict[str, Any]:
        """Search logs using Elasticsearch"""
        if not self.es_client:
            return {"error": "Elasticsearch not available", "logs": [], "total": 0}
        
        try:
            # Build Elasticsearch query
            es_query = {"bool": {"must": []}}
            
            # Text search
            if query.query:
                es_query["bool"]["must"].append({
                    "multi_match": {
                        "query": query.query,
                        "fields": ["message", "logger_name", "module", "function"]
                    }
                })
            
            # Level filter
            if query.level:
                es_query["bool"]["must"].append({
                    "term": {"level": query.level.value}
                })
            
            # Service filter
            if query.service:
                es_query["bool"]["must"].append({
                    "term": {"service": query.service}
                })
            
            # Trace ID filter
            if query.trace_id:
                es_query["bool"]["must"].append({
                    "term": {"trace_id": query.trace_id}
                })
            
            # User ID filter
            if query.user_id:
                es_query["bool"]["must"].append({
                    "term": {"user_id": query.user_id}
                })
            
            # Time range filter
            if query.start_time or query.end_time:
                time_range = {}
                if query.start_time:
                    time_range["gte"] = query.start_time.isoformat()
                if query.end_time:
                    time_range["lte"] = query.end_time.isoformat()
                
                es_query["bool"]["must"].append({
                    "range": {"timestamp": time_range}
                })
            
            # Tags filter
            for tag_key, tag_value in query.tags.items():
                es_query["bool"]["must"].append({
                    "term": {f"tags.{tag_key}": tag_value}
                })
            
            # Build index pattern
            if query.start_time and query.end_time:
                # Generate index pattern for date range
                indices = []
                current_date = query.start_time.date()
                end_date = query.end_time.date()
                
                while current_date <= end_date:
                    indices.append(f"{settings.ELASTICSEARCH_LOG_INDEX}-{current_date.strftime('%Y.%m.%d')}")
                    current_date += timedelta(days=1)
                
                index_pattern = ",".join(indices)
            else:
                index_pattern = f"{settings.ELASTICSEARCH_LOG_INDEX}-*"
            
            # Execute search
            response = await self.es_client.search(
                index=index_pattern,
                body={
                    "query": es_query,
                    "sort": [{query.sort_field: {"order": query.sort_order}}],
                    "from": query.offset,
                    "size": query.limit,
                    "_source": True
                }
            )
            
            # Process results
            logs = []
            for hit in response["hits"]["hits"]:
                log_data = hit["_source"]
                logs.append(log_data)
            
            return {
                "logs": logs,
                "total": response["hits"]["total"]["value"],
                "took": response["took"],
                "query": query.__dict__
            }
            
        except Exception as e:
            logging.getLogger(__name__).error(f"Error searching logs: {e}")
            return {"error": str(e), "logs": [], "total": 0}
    
    async def get_log_statistics(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get log statistics for a time period"""
        if not self.es_client:
            return {"error": "Elasticsearch not available"}
        
        try:
            # Build aggregation query
            agg_query = {
                "query": {
                    "range": {
                        "timestamp": {
                            "gte": start_time.isoformat(),
                            "lte": end_time.isoformat()
                        }
                    }
                },
                "aggs": {
                    "by_level": {
                        "terms": {"field": "level"}
                    },
                    "by_service": {
                        "terms": {"field": "service"}
                    },
                    "by_logger": {
                        "terms": {"field": "logger_name", "size": 20}
                    },
                    "errors_over_time": {
                        "filter": {"term": {"level": "ERROR"}},
                        "aggs": {
                            "timeline": {
                                "date_histogram": {
                                    "field": "timestamp",
                                    "fixed_interval": "1h"
                                }
                            }
                        }
                    }
                },
                "size": 0
            }
            
            response = await self.es_client.search(
                index=f"{settings.ELASTICSEARCH_LOG_INDEX}-*",
                body=agg_query
            )
            
            # Process aggregations
            stats = {
                "total_logs": response["hits"]["total"]["value"],
                "by_level": {
                    bucket["key"]: bucket["doc_count"]
                    for bucket in response["aggregations"]["by_level"]["buckets"]
                },
                "by_service": {
                    bucket["key"]: bucket["doc_count"]
                    for bucket in response["aggregations"]["by_service"]["buckets"]
                },
                "top_loggers": [
                    {"name": bucket["key"], "count": bucket["doc_count"]}
                    for bucket in response["aggregations"]["by_logger"]["buckets"]
                ],
                "errors_timeline": [
                    {
                        "timestamp": bucket["key_as_string"],
                        "count": bucket["doc_count"]
                    }
                    for bucket in response["aggregations"]["errors_over_time"]["timeline"]["buckets"]
                ]
            }
            
            return stats
            
        except Exception as e:
            logging.getLogger(__name__).error(f"Error getting log statistics: {e}")
            return {"error": str(e)}
    
    async def get_logs_by_trace(self, trace_id: str) -> List[Dict[str, Any]]:
        """Get all logs for a specific trace"""
        query = LogQuery(trace_id=trace_id, limit=1000, sort_field="timestamp", sort_order="asc")
        result = await self.search_logs(query)
        return result.get("logs", [])
    
    def create_logger(self, name: str, level: str = "INFO") -> logging.Logger:
        """Create a configured logger"""
        if name in self.configured_loggers:
            return self.configured_loggers[name]
        
        logger = logging.getLogger(name)
        logger.setLevel(getattr(logging, level.upper()))
        
        # Logger inherits handlers from root logger
        self.configured_loggers[name] = logger
        return logger
    
    def log_structured(
        self,
        level: LogLevel,
        message: str,
        logger_name: str = "app",
        trace_id: Optional[str] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None,
        extra_fields: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a structured message"""
        log_entry = LogEntry(
            timestamp=datetime.utcnow(),
            level=level,
            message=message,
            service=settings.SERVICE_NAME,
            logger_name=logger_name,
            trace_id=trace_id,
            user_id=user_id,
            request_id=request_id,
            tags=tags or {},
            extra_fields=extra_fields or {}
        )
        
        # Add to buffer for Elasticsearch
        if len(self.log_buffer) < self.buffer_size:
            self.log_buffer.append(log_entry)
        
        # Also log through Python logging system
        logger = self.create_logger(logger_name)
        
        # Add extra context to log record
        extra = {
            "trace_id": trace_id,
            "user_id": user_id,
            "request_id": request_id,
            "tags": tags or {},
            **(extra_fields or {})
        }
        
        logger.log(getattr(logging, level.value), message, extra=extra)
    
    def get_logging_stats(self) -> Dict[str, Any]:
        """Get logging service statistics"""
        return {
            "elasticsearch_enabled": self.es_client is not None,
            "logstash_enabled": self.logstash_handler is not None,
            "buffer_size": len(self.log_buffer),
            "configured_loggers": len(self.configured_loggers),
            "file_handlers": len(self.file_handlers),
            "log_level": settings.LOG_LEVEL,
            "log_retention_days": settings.LOG_RETENTION_DAYS
        }
    
    async def export_logs(
        self,
        query: LogQuery,
        format: str = "json"
    ) -> AsyncGenerator[str, None]:
        """Export logs in various formats"""
        if not self.es_client:
            yield '{"error": "Elasticsearch not available"}'
            return
        
        try:
            # Use scroll API for large exports
            search_body = {
                "query": {"bool": {"must": []}},
                "sort": [{"timestamp": {"order": "asc"}}],
                "_source": True
            }
            
            # Add query filters (similar to search_logs)
            if query.query:
                search_body["query"]["bool"]["must"].append({
                    "multi_match": {
                        "query": query.query,
                        "fields": ["message", "logger_name", "module", "function"]
                    }
                })
            
            # Initialize scroll
            response = await self.es_client.search(
                index=f"{settings.ELASTICSEARCH_LOG_INDEX}-*",
                body=search_body,
                scroll="5m",
                size=1000
            )
            
            scroll_id = response["_scroll_id"]
            
            if format == "json":
                yield "[\n"
                first = True
                
                while True:
                    hits = response["hits"]["hits"]
                    if not hits:
                        break
                    
                    for hit in hits:
                        if not first:
                            yield ",\n"
                        yield json.dumps(hit["_source"], indent=2)
                        first = False
                    
                    # Get next batch
                    response = await self.es_client.scroll(
                        scroll_id=scroll_id,
                        scroll="5m"
                    )
                
                yield "\n]"
            
            elif format == "csv":
                # CSV headers
                yield "timestamp,level,service,logger_name,message,trace_id,user_id\n"
                
                while True:
                    hits = response["hits"]["hits"]
                    if not hits:
                        break
                    
                    for hit in hits:
                        source = hit["_source"]
                        row = [
                            source.get("timestamp", ""),
                            source.get("level", ""),
                            source.get("service", ""),
                            source.get("logger_name", ""),
                            source.get("message", "").replace('"', '""'),
                            source.get("trace_id", ""),
                            source.get("user_id", "")
                        ]
                        yield f'"{"\",\"".join(row)}"\n'
                    
                    response = await self.es_client.scroll(
                        scroll_id=scroll_id,
                        scroll="5m"
                    )
            
            # Clear scroll
            await self.es_client.clear_scroll(scroll_id=scroll_id)
            
        except Exception as e:
            yield f'{{"error": "{str(e)}"}}'
    
    async def shutdown(self) -> None:
        """Shutdown logging service"""
        try:
            # Cancel background tasks
            for task in self._background_tasks:
                task.cancel()
            
            # Wait for tasks to complete
            if self._background_tasks:
                await asyncio.gather(*self._background_tasks, return_exceptions=True)
            
            # Flush remaining logs
            if self.es_handler:
                await self.es_handler._flush_buffer()
            
            # Close Elasticsearch client
            if self.es_client:
                await self.es_client.close()
            
            logging.getLogger(__name__).info("Logging service shutdown completed")
            
        except Exception as e:
            print(f"Error during logging shutdown: {e}")


# Global logging service instance
logging_service = LoggingService()


# Convenience functions
def get_logger(name: str, level: str = "INFO") -> logging.Logger:
    """Get a configured logger"""
    return logging_service.create_logger(name, level)


def log_info(message: str, **kwargs):
    """Log info message with structured data"""
    logging_service.log_structured(LogLevel.INFO, message, **kwargs)


def log_error(message: str, **kwargs):
    """Log error message with structured data"""
    logging_service.log_structured(LogLevel.ERROR, message, **kwargs)


def log_warning(message: str, **kwargs):
    """Log warning message with structured data"""
    logging_service.log_structured(LogLevel.WARNING, message, **kwargs)


def log_debug(message: str, **kwargs):
    """Log debug message with structured data"""
    logging_service.log_structured(LogLevel.DEBUG, message, **kwargs)