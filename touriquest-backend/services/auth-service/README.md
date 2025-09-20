# TouriQuest Authentication Service

A comprehensive authentication and user management microservice for the TouriQuest platform, built with FastAPI and PostgreSQL.

## Features

### 🔐 Core Authentication
- **JWT Access/Refresh Tokens**: Secure token-based authentication with automatic refresh
- **Multi-Provider OAuth2**: Google, Facebook, Apple, Twitter integration
- **Email Verification**: Customizable email templates with secure verification
- **Password Reset**: Secure token-based password reset system
- **Session Management**: Multi-device session tracking and management

### 🛡️ Security Features
- **Rate Limiting**: Configurable rate limits for all auth endpoints
- **Account Lockout**: Automatic protection against brute force attacks
- **Device Tracking**: Monitor and manage user devices and sessions
- **Audit Logging**: Comprehensive logging of all authentication events
- **Risk Scoring**: Real-time risk assessment for login attempts
- **IP Monitoring**: Track and analyze user IP patterns

### 👤 User Management
- **4-Step Onboarding**: Personalized travel preferences and interests
- **RBAC**: Role-based access control (User, Host, Admin, Moderator)
- **Profile Management**: Comprehensive user profile updates
- **GDPR Compliance**: Data processing consent and privacy controls
- **Multi-language Support**: Internationalization ready

### 📧 Email Features
- **Welcome Emails**: Personalized onboarding emails
- **Security Alerts**: Automatic notifications for suspicious activities
- **Verification Emails**: Beautiful HTML email templates
- **Password Reset**: Secure reset emails with expiration

## Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 12+
- Redis 6+ (optional, for production)

### Installation

1. **Clone and navigate to the service**:
```bash
cd touriquest-backend/services/auth-service
```

2. **Create and activate virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Setup environment variables**:
```bash
cp .env.template .env
# Edit .env with your configuration
```

5. **Setup database**:
```bash
# Create PostgreSQL database
createdb touriquest_auth

# Run migrations (if using Alembic)
alembic upgrade head
```

6. **Start the service**:
```bash
python -m app.main
# Or with uvicorn:
uvicorn app.main:app --reload --port 8001
```

The service will be available at `http://localhost:8001`

## API Documentation

When running in debug mode, interactive API documentation is available at:
- **Swagger UI**: `http://localhost:8001/docs`
- **ReDoc**: `http://localhost:8001/redoc`

### Main Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token

#### OAuth
- `POST /auth/oauth/{provider}/login` - OAuth login (Google, Facebook, Apple, Twitter)
- `POST /auth/oauth/{provider}/link` - Link OAuth account
- `DELETE /auth/oauth/{provider}/unlink` - Unlink OAuth account

#### Email & Password
- `POST /auth/verify-email` - Verify email address
- `POST /auth/password-reset/request` - Request password reset
- `POST /auth/password-reset/confirm` - Confirm password reset
- `POST /auth/change-password` - Change password

#### Onboarding
- `POST /auth/onboarding/step1` - Travel preferences
- `POST /auth/onboarding/step2` - Travel interests
- `POST /auth/onboarding/step3` - Communication preferences
- `POST /auth/onboarding/step4` - Privacy settings

#### User Profile
- `GET /auth/me` - Get current user profile
- `PUT /auth/me` - Update user profile
- `GET /auth/sessions` - Get active sessions
- `DELETE /auth/sessions/{session_id}` - Revoke session

## Configuration

### Environment Variables

#### Database
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

#### JWT Configuration
```bash
SECRET_KEY=your-super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
```

#### OAuth Providers
```bash
# Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Apple
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=path/to/apple/private/key.p8

# Twitter
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
```

#### Email Configuration
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@touriquest.com
```

## Database Schema

### Core Models

#### User
- Basic user information (email, name, avatar)
- Authentication data (password hash, verification status)
- Onboarding data (travel preferences, interests)
- Security data (failed attempts, lockout status)
- GDPR compliance (consent tracking)

#### Sessions & Tokens
- `UserSession`: Device and browser tracking
- `AuthToken`: JWT token management
- `BlacklistedToken`: Revoked tokens

#### OAuth Integration
- `OAuthAccount`: OAuth provider accounts
- `SocialConnection`: Social media connections

#### Security & Audit
- `AuditLog`: All authentication events
- `DeviceFingerprint`: Device tracking
- `RateLimitRecord`: Rate limiting data

## Security Features

### Rate Limiting
- **Login**: 5 attempts per 5 minutes per IP/email
- **Registration**: 3 attempts per 5 minutes per IP
- **Password Reset**: 3 attempts per hour per IP/email
- **Email Verification**: 5 attempts per hour per IP

### Account Protection
- **Lockout**: Account locked after 5 failed login attempts
- **Risk Scoring**: Real-time risk assessment based on:
  - Failed login attempts
  - Account age
  - Device trust score
  - IP reputation

### Device Management
- **Fingerprinting**: Track device characteristics
- **Session Tracking**: Monitor all active sessions
- **Device Trust**: Build trust scores over time

## Development

### Project Structure
```
app/
├── api/                # API routes
│   └── auth_routes.py  # Authentication endpoints
├── core/               # Core functionality
│   ├── security.py     # JWT, password hashing
│   ├── dependencies.py # FastAPI dependencies
│   └── rate_limiting.py # Rate limiting logic
├── models/             # SQLAlchemy models
│   └── __init__.py     # All database models
├── schemas/            # Pydantic schemas
│   └── __init__.py     # Request/response models
├── services/           # Business logic
│   ├── auth_service.py # Authentication service
│   └── oauth_service.py # OAuth integration
├── utils/              # Utilities
│   └── email.py        # Email templates and sending
├── database.py         # Database configuration
└── main.py            # FastAPI application
```

### Testing
```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py
```

### Code Quality
```bash
# Format code
black app/
isort app/

# Lint code
flake8 app/
mypy app/
```

## Docker Deployment

### Build Image
```bash
docker build -t touriquest-auth-service .
```

### Run Container
```bash
docker run -p 8001:8001 \
  -e DATABASE_URL=postgresql://... \
  -e SECRET_KEY=... \
  touriquest-auth-service
```

### Docker Compose
```yaml
version: '3.8'
services:
  auth-service:
    build: .
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/touriquest_auth
      - SECRET_KEY=your-secret-key
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: touriquest_auth
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    
volumes:
  postgres_data:
```

## Monitoring & Health Checks

### Health Endpoints
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with dependencies

### Metrics
The service exposes Prometheus metrics for monitoring:
- Request counts and latencies
- Authentication success/failure rates
- Active sessions
- Rate limit violations

### Logging
Structured logging with the following events:
- Authentication attempts (success/failure)
- OAuth flows
- Security events (lockouts, suspicious activity)
- API requests and responses

## Production Considerations

### Security Checklist
- [ ] Change default SECRET_KEY
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS only
- [ ] Configure proper CORS origins
- [ ] Set up Redis for session storage
- [ ] Configure email service (SendGrid, AWS SES)
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Enable rate limiting
- [ ] Set up database backups

### Performance
- Use Redis for session storage and caching
- Enable database connection pooling
- Configure proper database indexes
- Set up load balancing for multiple instances
- Monitor and optimize slow queries

### Scaling
- Stateless design allows horizontal scaling
- Use Redis for shared session storage
- Database read replicas for improved performance
- Consider API Gateway for routing and rate limiting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.