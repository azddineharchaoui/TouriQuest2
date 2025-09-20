# TouriQuest Backend - Microservices Architecture

Production-ready FastAPI microservices platform for TouriQuest travel application.

## 🏗️ Architecture Overview

### Technology Stack
- **Framework**: FastAPI 0.104+ (Python 3.11+)
- **Database**: PostgreSQL 15+ with Redis 7+ (caching/sessions)
- **Search**: Elasticsearch 8+
- **Message Queue**: Celery with Redis/RabbitMQ
- **AI/ML**: OpenAI GPT-4, Whisper, Embeddings, Anthropic Claude
- **File Storage**: AWS S3 + CloudFront CDN
- **Authentication**: JWT + OAuth2 + RBAC
- **Payments**: Stripe Connect + Webhooks
- **Real-time**: WebSockets + Server-Sent Events
- **Maps**: Google Maps API + Mapbox
- **Monitoring**: Prometheus + Grafana + Sentry
- **Deployment**: Docker + Kubernetes + GitHub Actions

### Microservices
- **api-gateway**: Kong/Nginx reverse proxy
- **auth-service**: Authentication & authorization
- **user-service**: User profiles & social features
- **property-service**: Property management & search
- **booking-service**: Reservations & payments
- **poi-service**: Points of interest
- **experience-service**: Activity booking
- **ai-service**: AI assistant & recommendations
- **media-service**: File upload & processing
- **notification-service**: Multi-channel notifications
- **analytics-service**: Data analytics & reporting
- **admin-service**: Admin dashboard & moderation

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Poetry
- Docker & Docker Compose
- Kubernetes (kubectl)

### Local Development Setup

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd touriquest-backend
poetry install
poetry shell
```

2. **Setup pre-commit hooks**:
```bash
pre-commit install
```

3. **Start infrastructure services**:
```bash
docker-compose up -d postgres redis elasticsearch rabbitmq
```

4. **Run database migrations**:
```bash
make migrate
```

5. **Start all services**:
```bash
make dev
```

### Available Commands

```bash
# Development
make dev              # Start all services in development mode
make test             # Run all tests
make lint             # Run linting and formatting
make migrate          # Run database migrations
make clean            # Clean up containers and volumes

# Production
make build            # Build Docker images
make deploy-dev       # Deploy to development environment
make deploy-staging   # Deploy to staging environment
make deploy-prod      # Deploy to production environment
```

## 📁 Project Structure

```
touriquest-backend/
├── .github/workflows/           # CI/CD pipelines
├── docker/                      # Docker configurations
├── k8s/                        # Kubernetes manifests
├── scripts/                    # Utility scripts
├── shared/                     # Shared libraries
│   ├── database/               # Database models and utilities
│   ├── messaging/              # Message queue utilities
│   ├── monitoring/             # Monitoring and logging
│   └── security/               # Security utilities
├── services/                   # Microservices
│   ├── api-gateway/
│   ├── auth-service/
│   ├── user-service/
│   ├── property-service/
│   ├── booking-service/
│   ├── poi-service/
│   ├── experience-service/
│   ├── ai-service/
│   ├── media-service/
│   ├── notification-service/
│   ├── analytics-service/
│   └── admin-service/
├── tests/                      # Integration tests
├── docs/                       # API documentation
├── docker-compose.yml          # Local development
├── docker-compose.prod.yml     # Production setup
└── Makefile                    # Development commands
```

## 🔧 Configuration

### Environment Variables

Each service supports environment-specific configuration:

- `ENVIRONMENT`: dev, staging, prod
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `ELASTICSEARCH_URL`: Elasticsearch connection string
- `RABBITMQ_URL`: RabbitMQ connection string

### Service Communication

Services communicate via:
- **HTTP/REST**: For synchronous operations
- **Message Queue**: For asynchronous operations
- **WebSockets**: For real-time features

## 🧪 Testing

### Running Tests

```bash
# Unit tests
poetry run pytest services/auth-service/tests/

# Integration tests
poetry run pytest tests/

# Load tests
poetry run locust -f tests/load/locustfile.py
```

### Test Coverage

Maintain >90% test coverage across all services.

## 📊 Monitoring & Observability

### Metrics
- Prometheus metrics exposed on `/metrics`
- Custom business metrics
- Performance monitoring

### Logging
- Structured JSON logging
- Centralized log aggregation
- Error tracking with Sentry

### Tracing
- OpenTelemetry distributed tracing
- Request flow visualization
- Performance bottleneck identification

## 🔐 Security

### Authentication & Authorization
- JWT tokens with refresh mechanism
- OAuth2 with multiple providers
- Role-based access control (RBAC)
- Rate limiting and DDoS protection

### Data Protection
- Encryption at rest and in transit
- GDPR compliance
- PCI DSS for payment processing
- Regular security audits

## 🚀 Deployment

### Development
```bash
kubectl apply -f k8s/environments/dev/
```

### Staging
```bash
kubectl apply -f k8s/environments/staging/
```

### Production
```bash
kubectl apply -f k8s/environments/prod/
```

### CI/CD Pipeline

GitHub Actions automatically:
1. Run tests and linting
2. Build Docker images
3. Deploy to environments
4. Run integration tests
5. Monitor deployment health

## 📖 API Documentation

- **Development**: http://localhost:8000/docs
- **Staging**: https://api-staging.touriquest.com/docs
- **Production**: https://api.touriquest.com/docs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run pre-commit checks
5. Submit a pull request

## 📞 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: Create GitHub issues
- **Contact**: dev@touriquest.com

---

**TouriQuest Backend** - Built with ❤️ for modern travel experiences.