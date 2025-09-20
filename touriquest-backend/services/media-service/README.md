# TouriQuest Media Service

A comprehensive media management and content processing service for the TouriQuest tourism platform. This service handles upload, storage, processing, and delivery of all media content including images, videos, audio files, documents, and AR content.

## Features

### 🎨 Media Management
- **Multi-format Support**: Images (JPEG, PNG, GIF, WebP), Videos (MP4, AVI, MOV), Audio (MP3, WAV, AAC), Documents (PDF, DOC), AR content (GLTF)
- **Automatic Optimization**: Image resizing, video transcoding, audio normalization
- **Intelligent Storage**: AWS S3 integration with CloudFront CDN for global delivery
- **Variant Generation**: Multiple quality levels and formats for optimal delivery

### 🔍 Content Discovery
- **Advanced Search**: Full-text search across titles, descriptions, and metadata
- **Smart Filtering**: Filter by media type, date range, file size, language, tags
- **Duplicate Detection**: Identify exact and similar content using multiple algorithms
- **Auto-tagging**: AI-powered content classification and tag generation

### 🛡️ Content Moderation
- **Multi-layer Moderation**: AI analysis + human review workflow
- **NSFW Detection**: Automatic inappropriate content detection
- **Virus Scanning**: Real-time malware detection using ClamAV
- **DMCA Compliance**: Copyright protection and takedown management

### 🌍 Multi-language Support
- **Content Localization**: Multi-language metadata and descriptions
- **Language Detection**: Automatic content language identification
- **Regional Delivery**: Geo-optimized content delivery

### 📊 Analytics & Monitoring
- **Usage Tracking**: Detailed analytics on media consumption
- **Performance Metrics**: Processing times, storage usage, CDN performance
- **Health Monitoring**: Real-time service health and dependency status

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile App     │    │ Admin Dashboard │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    └─────────┬───────┘
                              │
                ┌─────────────────────────┐
                │    Media Service API    │
                └─────────┬───────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Media Core  │  │ Processing  │  │  Content    │
│  Service    │  │   Engine    │  │ Management  │
└─────────────┘  └─────────────┘  └─────────────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
┌─────────┐      ┌─────────────┐      ┌─────────────┐
│   S3    │      │  PostgreSQL │      │    Redis    │
│ Storage │      │  Database   │      │    Cache    │
└─────────┘      └─────────────┘      └─────────────┘
```

## Quick Start

### Prerequisites
- Python 3.9+
- PostgreSQL 12+
- Redis 6+
- FFmpeg (for video processing)
- ImageMagick (for image processing)
- AWS Account with S3 access

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd touriquest-backend/services/media-service
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -e .
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Initialize database**
```bash
alembic upgrade head
```

6. **Start the service**
```bash
python -m app.main
```

### Docker Setup

1. **Build the image**
```bash
docker build -t touriquest-media-service .
```

2. **Run with docker-compose**
```bash
docker-compose up -d
```

## Configuration

The service uses environment variables for configuration. Key settings include:

### Required Settings
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/touriquest_media

# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-media-bucket

# Security
SECRET_KEY=your-secret-key

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Optional Settings
```env
# Processing
MAX_FILE_SIZE_MB=500
ENABLE_VIDEO_TRANSCODING=true
ENABLE_AUTO_TAGGING=true

# Content Moderation
ENABLE_CONTENT_MODERATION=true
MODERATION_CONFIDENCE_THRESHOLD=0.8

# Performance
DATABASE_POOL_SIZE=20
REDIS_CACHE_TTL=3600
```

## API Documentation

### Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Upload Media
```http
POST /api/v1/media/upload
Content-Type: multipart/form-data

file: <file>
title: "My Image"
description: "Description of the image"
privacy_level: "public"
tags: "travel,morocco,landscape"
```

### Search Media
```http
GET /api/v1/media/search?query=landscape&media_type=image&limit=20
```

### Get Media Details
```http
GET /api/v1/media/{media_id}
```

### Generate Variants
```http
POST /api/v1/media/{media_id}/variants
{
  "variant_types": ["thumbnail", "medium", "webp_high"]
}
```

## Processing Pipeline

### Image Processing
1. **Upload Validation**: File type, size, virus scan
2. **Metadata Extraction**: EXIF data, dimensions, color profile
3. **Variant Generation**: Multiple sizes and formats
4. **Optimization**: Compression, progressive JPEG, WebP conversion
5. **CDN Upload**: Distributed storage with cache headers

### Video Processing
1. **Format Detection**: Codec analysis and validation
2. **Transcoding**: Multiple resolutions (240p to 4K)
3. **Thumbnail Generation**: Automatic frame extraction
4. **Optimization**: H.264 encoding with optimal settings
5. **Streaming Preparation**: Adaptive bitrate streaming support

### Audio Processing
1. **Format Normalization**: Conversion to standard formats
2. **Quality Variants**: Multiple bitrate options
3. **Metadata Extraction**: ID3 tags, duration, sample rate
4. **Compression**: Optimal encoding for web delivery

## Background Jobs

The service uses Celery for background processing:

### Job Types
- **media_processing**: Main processing pipeline
- **virus_scanning**: Security scanning
- **content_moderation**: AI content analysis
- **variant_generation**: On-demand variant creation
- **duplicate_detection**: Content similarity analysis

### Monitoring Jobs
```bash
# View active jobs
celery -A app.tasks.media_processing inspect active

# Monitor job queues
celery -A app.tasks.media_processing inspect stats
```

## Development

### Project Structure
```
app/
├── main.py                 # FastAPI application
├── core/
│   ├── config.py          # Configuration settings
│   ├── database.py        # Database connection
│   └── auth.py            # Authentication
├── models/
│   └── __init__.py        # Database models
├── schemas/
│   └── media_schemas.py   # Pydantic schemas
├── services/
│   ├── media_service.py   # Core media operations
│   └── content_service.py # Content management
├── tasks/
│   └── media_processing.py # Background jobs
└── api/
    └── routes/
        └── media_routes.py # API endpoints
```

### Running Tests
```bash
# Unit tests
pytest tests/unit/

# Integration tests
pytest tests/integration/

# Load tests
pytest tests/load/

# All tests with coverage
pytest --cov=app
```

### Code Quality
```bash
# Format code
black app/
isort app/

# Lint
flake8 app/
mypy app/

# Pre-commit hooks
pre-commit run --all-files
```

## Deployment

### Production Setup

1. **Environment Configuration**
```bash
export ENVIRONMENT=production
export DEBUG=false
export DATABASE_URL=postgresql://...
export S3_BUCKET_NAME=prod-media-bucket
```

2. **Database Migration**
```bash
alembic upgrade head
```

3. **Start Services**
```bash
# Web server
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# Background workers
celery -A app.tasks.media_processing worker -l info
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: media-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: media-service
  template:
    metadata:
      labels:
        app: media-service
    spec:
      containers:
      - name: media-service
        image: touriquest/media-service:latest
        ports:
        - containerPort: 8003
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: media-secrets
              key: database-url
```

## Monitoring

### Health Checks
```http
GET /health
```

### Metrics
```http
GET /metrics
```

### Prometheus Metrics
- `media_uploads_total`: Total uploads by type
- `media_processing_duration_seconds`: Processing time
- `media_storage_bytes`: Storage usage
- `media_requests_total`: API request count

### Grafana Dashboards
- Media Service Overview
- Processing Performance
- Storage Analytics
- Error Tracking

## Security

### Data Protection
- **Encryption at Rest**: All media files encrypted in S3
- **Encryption in Transit**: TLS 1.3 for all communications
- **Access Control**: Role-based permissions
- **Audit Logging**: Complete activity tracking

### Content Security
- **Virus Scanning**: Real-time malware detection
- **Content Moderation**: AI + human review
- **DMCA Protection**: Automated copyright compliance
- **Privacy Controls**: Granular sharing permissions

## Performance

### Optimization Strategies
- **CDN Integration**: Global content delivery
- **Lazy Loading**: On-demand variant generation
- **Caching**: Multi-layer cache strategy
- **Compression**: Optimal encoding algorithms

### Scaling
- **Horizontal Scaling**: Stateless service design
- **Database Sharding**: Content distribution
- **Background Processing**: Async job queues
- **Storage Tiering**: Cost-optimized storage

## Troubleshooting

### Common Issues

**Upload Failures**
```bash
# Check file permissions
ls -la uploads/

# Verify S3 access
aws s3 ls s3://your-bucket/

# Check virus scanner
clamdscan --version
```

**Processing Delays**
```bash
# Monitor Celery workers
celery -A app.tasks.media_processing inspect active

# Check Redis connection
redis-cli ping

# Review processing logs
tail -f logs/processing.log
```

**Database Issues**
```bash
# Check connections
psql $DATABASE_URL -c "SELECT version();"

# Monitor slow queries
tail -f postgresql.log | grep "slow query"
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 style guide
- Write comprehensive tests
- Update documentation
- Use semantic commit messages

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- 📧 Email: dev@touriquest.com
- 📖 Documentation: https://docs.touriquest.com
- 🐛 Issues: GitHub Issues
- 💬 Discord: TouriQuest Community

---

**TouriQuest Media Service** - Powering seamless media experiences for global tourism 🌍