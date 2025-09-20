# 🚀 TouriQuest CI/CD Pipeline

## Overview

This repository contains a comprehensive CI/CD pipeline for TouriQuest, a tourism platform built with modern DevOps practices. The pipeline includes automated testing, security scanning, container builds, blue-green deployments, and comprehensive monitoring.

## 🏗️ Architecture

### Pipeline Stages

1. **Pre-commit Checks**
   - Code formatting (Black, isort)
   - Linting (flake8, pylint)
   - Type checking (mypy)
   - Security scanning (bandit)
   - Dependency vulnerability checks

2. **Testing Pipeline**
   - Unit tests with pytest
   - Integration tests with test database
   - End-to-end tests
   - Load testing with Locust
   - Coverage reporting

3. **Build Pipeline**
   - Multi-architecture Docker builds (AMD64, ARM64)
   - Container security scanning with Trivy
   - Image optimization and caching
   - Artifact publishing to GitHub Container Registry

4. **Deployment Pipeline**
   - Blue-green deployments to Kubernetes
   - Automated database migrations
   - Health verification
   - Rollback capabilities
   - Slack/email notifications

5. **Monitoring & Observability**
   - Prometheus metrics collection
   - Grafana dashboards
   - Alerting with AlertManager
   - Log aggregation with ELK stack
   - Error tracking with Sentry

## 🚦 Getting Started

### Prerequisites

- Docker and Docker Compose
- Kubernetes cluster access
- GitHub account with container registry access
- Node.js 20+ and Python 3.11+

### Quick Start

```bash
# Clone the repository
git clone https://github.com/azddineharchaoui/touriquest2.git
cd touriquest2

# Setup development environment
make quickstart

# Or manually:
make setup-dev
make dev-up
```

### Development Workflow

```bash
# Install dependencies
make install

# Format and lint code
make format
make lint

# Run tests
make test

# Run specific test types
make test-unit
make test-integration
make test-e2e

# Load testing
make load-test

# Security checks
make security
make audit
```

## 🐳 Docker Configuration

### Development Environment

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Services Available in Development

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 8000 | Main API entry point |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching and sessions |
| Elasticsearch | 9200 | Search engine |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3000 | Monitoring dashboards |
| Jaeger | 16686 | Distributed tracing |
| MailHog | 8025 | Email testing |
| MinIO | 9000 | S3-compatible storage |

### Production Deployment

```bash
# Deploy to staging
make deploy-staging

# Deploy to production (requires confirmation)
make deploy-prod

# Rollback if needed
make rollback
```

## ☸️ Kubernetes Deployment

### Environments

- **Development**: Local Docker Compose
- **Staging**: Kubernetes cluster with staging configurations
- **Production**: Kubernetes cluster with blue-green deployment

### Blue-Green Deployment Process

1. Deploy new version to "green" environment
2. Run health checks and smoke tests
3. Switch traffic from "blue" to "green"
4. Monitor for issues
5. Scale down "blue" environment after verification
6. Automatic rollback on failure

### Kubernetes Resources

```bash
# View staging environment
kubectl get pods -n touriquest-staging

# View production environment
kubectl get pods -n touriquest-production

# Check deployment status
kubectl rollout status deployment/api-gateway -n touriquest-production
```

## 🔧 CI/CD Configuration

### GitHub Actions Workflows

- **Main Pipeline**: `.github/workflows/ci-cd-pipeline.yml`
  - Triggered on push to main/develop branches
  - Runs complete test suite
  - Builds and scans container images
  - Deploys to appropriate environments

### Environment Variables Required

#### GitHub Secrets

```yaml
# Database
DATABASE_URL: postgresql://user:pass@host:5432/dbname

# Authentication
JWT_SECRET_KEY: your-jwt-secret-key

# Third-party Services
STRIPE_SECRET_KEY: sk_live_...
OPENAI_API_KEY: sk-...
SENTRY_DSN: https://...

# Cloud Provider
AWS_ACCESS_KEY_ID: AKIA...
AWS_SECRET_ACCESS_KEY: ...

# Kubernetes
KUBE_CONFIG_STAGING: base64-encoded-kubeconfig
KUBE_CONFIG_PRODUCTION: base64-encoded-kubeconfig

# Notifications
SLACK_WEBHOOK: https://hooks.slack.com/...
NOTIFICATION_EMAIL: admin@touriquest.com
```

## 📊 Monitoring & Observability

### Prometheus Metrics

The application exposes metrics at `/metrics` endpoint for each service:

- HTTP request metrics (duration, status codes, throughput)
- Database connection metrics
- Redis cache metrics
- Business metrics (bookings, users, revenue)
- Custom application metrics

### Grafana Dashboards

Pre-configured dashboards for:

- **Infrastructure Overview**: CPU, memory, disk usage
- **Application Performance**: Response times, error rates, throughput
- **Business Metrics**: Bookings, revenue, user activity
- **Database Performance**: Query times, connections, locks
- **Security Monitoring**: Failed logins, rate limiting

### Alerting Rules

Critical alerts configured for:

- Service downtime
- High error rates (>5%)
- High response times (>1s for 95th percentile)
- Database connection issues
- Memory/CPU usage >85%
- SSL certificate expiry
- Failed payment rate >2%

### Log Aggregation

- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: DEBUG (dev), INFO (staging), WARNING (prod)
- **Retention**: 30 days for applications, 90 days for security logs

## 🔒 Security Features

### Security Scanning

- **Container Scanning**: Trivy for vulnerability detection
- **Code Analysis**: Bandit for Python security issues
- **Dependency Scanning**: Safety for known vulnerabilities
- **Secret Detection**: Pre-commit hooks for credential scanning

### Security Policies

- **Network Policies**: Kubernetes network segmentation
- **Pod Security**: Non-root containers, read-only filesystems
- **RBAC**: Role-based access control for all services
- **TLS**: End-to-end encryption with automated certificate management

### Compliance

- **GDPR**: Data protection and privacy controls
- **PCI DSS**: Payment card industry compliance
- **SOC 2**: Security and availability controls
- **Audit Logging**: All administrative actions logged

## 🧪 Testing Strategy

### Test Pyramid

1. **Unit Tests** (70%): Individual component testing
2. **Integration Tests** (20%): Service integration testing
3. **E2E Tests** (10%): Full workflow testing

### Test Configuration

```python
# Run specific test types
pytest tests/unit/          # Unit tests
pytest tests/integration/   # Integration tests
pytest tests/e2e/          # End-to-end tests
pytest tests/load/         # Load tests with Locust
```

### Coverage Requirements

- **Minimum Coverage**: 80%
- **Critical Paths**: 95%
- **New Code**: 100%

## 📈 Performance & Scalability

### Performance Targets

- **API Response Time**: <200ms (95th percentile)
- **Database Query Time**: <50ms (average)
- **Search Response Time**: <100ms
- **File Upload Speed**: >10MB/s

### Scalability Features

- **Horizontal Pod Autoscaling**: Based on CPU/memory metrics
- **Database Read Replicas**: For read-heavy workloads
- **CDN Integration**: Global content delivery
- **Caching Strategy**: Multi-level caching (Redis, CDN, application)

### Load Testing

```bash
# Run load tests
make load-test

# Custom load test
locust -f tests/load/locustfile.py \
  --headless \
  --users 1000 \
  --spawn-rate 50 \
  --run-time 10m \
  --host https://api.touriquest.com
```

## 🛠️ Development Tools

### Available Commands

```bash
# Development
make setup-dev        # Setup development environment
make dev-up           # Start development services
make dev-down         # Stop development services
make dev-logs         # View service logs

# Code Quality
make format           # Format code
make lint             # Lint code
make security         # Security checks
make pre-commit       # Run pre-commit hooks

# Testing
make test             # Run all tests
make test-unit        # Unit tests only
make coverage         # Generate coverage report

# Database
make migrate          # Run migrations
make migration        # Create new migration
make db-backup        # Backup database
make db-restore       # Restore database

# Deployment
make build            # Build Docker images
make deploy-staging   # Deploy to staging
make deploy-prod      # Deploy to production
make rollback         # Rollback deployment

# Monitoring
make health           # Check system health
make monitoring-up    # Start monitoring stack
make resources        # View resource usage

# Utilities
make clean            # Clean up resources
make docs             # Generate documentation
make ssl-dev          # Generate dev SSL certificates
```

### IDE Configuration

Pre-configured settings for:

- **VS Code**: Python extension, formatting, linting
- **PyCharm**: Code style, run configurations
- **Docker**: Development containers

## 🚨 Troubleshooting

### Common Issues

#### Services Not Starting

```bash
# Check Docker status
docker system info

# Check service logs
docker-compose -f docker-compose.dev.yml logs [service-name]

# Restart services
make dev-down && make dev-up
```

#### Test Failures

```bash
# Run tests with verbose output
pytest tests/ -v -s

# Check test database
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d touriquest_test
```

#### Deployment Issues

```bash
# Check Kubernetes resources
kubectl get pods -n touriquest-staging
kubectl describe pod [pod-name] -n touriquest-staging

# View deployment logs
kubectl logs deployment/api-gateway -n touriquest-staging
```

### Health Checks

```bash
# Development environment
curl http://localhost:8000/health

# Staging environment
curl https://api-staging.touriquest.com/health

# Production environment
curl https://api.touriquest.com/health
```

## 📞 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/azddineharchaoui/touriquest2/issues)
- **Slack**: #touriquest-dev
- **Email**: devops@touriquest.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by the TouriQuest Team**