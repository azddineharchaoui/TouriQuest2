# API Gateway

Production-ready API Gateway for TouriQuest microservices architecture.

## Features

- **Load Balancing**: Round-robin, weighted, and random strategies
- **Circuit Breaker**: Automatic failure detection and recovery
- **Rate Limiting**: Configurable request limits per client
- **Health Checks**: Automated service health monitoring
- **Security**: CORS, trusted hosts, security headers
- **Monitoring**: Prometheus metrics and OpenTelemetry tracing
- **Service Discovery**: Dynamic service registration and discovery

## Architecture

The API Gateway acts as a single entry point for all client requests, routing them to appropriate microservices:

```
Client Request → API Gateway → Microservice
              ↓
          ┌─────────────┐
          │ Rate Limit  │
          │ Auth Check  │
          │ Load Balance│
          │ Circuit Br. │
          └─────────────┘
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configuration options:

- `GATEWAY_RATE_LIMIT_REQUESTS`: Requests per minute per client
- `GATEWAY_CIRCUIT_BREAKER_FAILURE_THRESHOLD`: Failures before opening circuit
- `GATEWAY_LOAD_BALANCING_STRATEGY`: Load balancing strategy
- `GATEWAY_CORS_ORIGINS`: Allowed CORS origins

### Service Registry

Services are automatically registered with health checks:

```python
from service_registry import ServiceRegistry

registry = ServiceRegistry()
await registry.start_health_checks()
```

## Routing

The gateway routes requests based on URL prefixes:

- `/api/v1/auth/*` → Auth Service
- `/api/v1/users/*` → User Service
- `/api/v1/properties/*` → Property Service
- `/api/v1/bookings/*` → Booking Service
- `/api/v1/pois/*` → POI Service
- `/api/v1/experiences/*` → Experience Service
- `/api/v1/ai/*` → AI Service
- `/api/v1/media/*` → Media Service
- `/api/v1/notifications/*` → Notification Service
- `/api/v1/analytics/*` → Analytics Service
- `/api/v1/admin/*` → Admin Service

## Circuit Breaker

Automatic circuit breaker protection prevents cascading failures:

```python
# Circuit breaker states
- CLOSED: Normal operation
- OPEN: All requests fail fast
- HALF_OPEN: Testing if service recovered
```

Configuration:
- Failure threshold: 5 consecutive failures
- Timeout: 60 seconds before retry
- Success threshold: 3 successes to close circuit

## Health Checks

### Gateway Health

```bash
GET /health/detailed
```

Returns:
```json
{
  "gateway": "healthy",
  "services": {
    "auth": "healthy",
    "user": "healthy",
    "property": "degraded"
  },
  "overall": "degraded",
  "unhealthy_services": ["property"]
}
```

### Service Status

```bash
GET /services
```

Returns available services and route mappings.

## Rate Limiting

Configurable rate limiting per client IP:

- Default: 1000 requests per minute
- Sliding window algorithm
- Returns `429 Too Many Requests` when exceeded

## Security Features

### CORS Configuration
- Configurable allowed origins
- Supports credentials
- All HTTP methods allowed

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`

### Trusted Hosts
- Validates `Host` header
- Prevents host header attacks

## Monitoring

### Metrics
- Request count by service
- Response time distribution
- Error rates
- Circuit breaker states

### Tracing
- OpenTelemetry integration
- Request correlation IDs
- Distributed tracing across services

## Development

### Running Locally

```bash
# Install dependencies
poetry install

# Start gateway
poetry run uvicorn main:app --reload --port 8000

# Or with make
make dev-gateway
```

### Docker

```bash
# Build image
docker build -t touriquest-gateway .

# Run container
docker run -p 8000:8000 touriquest-gateway
```

### Testing

```bash
# Run tests
poetry run pytest

# With coverage
poetry run pytest --cov=.

# Load testing
poetry run locust -f tests/load_test.py
```

## Production Deployment

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: touriquest/api-gateway:latest
        ports:
        - containerPort: 8000
        env:
        - name: GATEWAY_WORKERS
          value: "4"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### High Availability

For production environments:

1. **Multiple Instances**: Deploy 3+ gateway instances
2. **Load Balancer**: Use external load balancer (AWS ALB, GCP Load Balancer)
3. **Health Checks**: Configure proper health check endpoints
4. **Circuit Breakers**: Tune thresholds for your traffic patterns
5. **Rate Limiting**: Adjust based on capacity planning
6. **Monitoring**: Set up alerts for high error rates and latency

## Troubleshooting

### Common Issues

1. **Service Unavailable (503)**
   - Check service health endpoints
   - Verify service discovery configuration
   - Check network connectivity

2. **Circuit Breaker Open**
   - Check downstream service logs
   - Verify service health
   - Consider increasing failure threshold

3. **Rate Limit Exceeded (429)**
   - Increase rate limit if legitimate traffic
   - Implement client-side rate limiting
   - Check for abuse patterns

### Debug Mode

Enable debug mode for detailed logging:

```bash
GATEWAY_DEBUG=true poetry run uvicorn main:app
```

### Logs

Gateway logs include:
- Request/response details
- Circuit breaker state changes
- Health check results
- Rate limiting events

## API Reference

### Endpoints

- `GET /` - Gateway status
- `GET /health/detailed` - Detailed health check
- `GET /services` - List available services
- `GET /metrics` - Prometheus metrics (if enabled)

### Headers

The gateway adds these headers to requests:

- `X-Forwarded-For`: Client IP
- `X-Forwarded-Proto`: Request protocol
- `X-Forwarded-Host`: Original host
- `X-Request-ID`: Unique request identifier

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all health checks pass