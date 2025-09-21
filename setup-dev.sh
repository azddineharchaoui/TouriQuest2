#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - SETUP SCRIPT (WSL/Ubuntu)
# =============================================================================

set -e  # Exit on any error

echo ""
echo "==============================================="
echo "   TouriQuest Development Environment Setup"
echo "==============================================="
echo ""

echo "[1/8] Checking prerequisites..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    echo "Please install Docker from https://docs.docker.com/engine/install/ubuntu/"
    exit 1
else
    echo "✅ Docker is installed"
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running"
    echo "Please start Docker daemon and try again."
    echo "You can start it with: sudo systemctl start docker"
    exit 1
else
    echo "✅ Docker is running"
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available"
    echo "Please install Docker Compose or use 'docker-compose' instead"
    exit 1
else
    echo "✅ Docker Compose is available"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/ or use:"
    echo "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "sudo apt-get install -y nodejs"
    exit 1
else
    echo "✅ Node.js is installed ($(node --version))"
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed"
    echo "Please install Python with: sudo apt-get install python3 python3-pip"
    exit 1
else
    echo "✅ Python is installed ($(python3 --version))"
fi

echo ""
echo "[2/8] Creating necessary directories..."
mkdir -p data/{postgres,redis,elasticsearch,minio} logs
echo "✅ Directories created"

echo ""
echo "[3/8] Setting up frontend dependencies..."
if [ -f "frontend/package.json" ]; then
    echo "Installing npm dependencies..."
    cd frontend
    if ! npm install; then
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
    echo "✅ Frontend dependencies installed"
    cd ..
else
    echo "❌ package.json not found in frontend directory"
    exit 1
fi

echo ""
echo "[4/8] Setting up backend dependencies..."
if [ -f "setup-backend-deps.sh" ]; then
    echo "Using alternative backend setup..."
    chmod +x setup-backend-deps.sh
    if ! ./setup-backend-deps.sh; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
elif [ -f "pyproject.toml" ]; then
    echo "Installing shared Python dependencies..."
    if ! pip3 install -e .[dev]; then
        echo "⚠️  Failed to install as editable package, trying shared dependencies only..."
        # Install development dependencies directly
        if ! pip3 install pytest pytest-cov pytest-asyncio black isort mypy bandit; then
            echo "❌ Failed to install backend dependencies"
            exit 1
        fi
    fi
    echo "✅ Backend dependencies installed"
else
    echo "⚠️  pyproject.toml not found in root directory"
    echo "Installing basic development dependencies..."
    pip3 install pytest pytest-cov pytest-asyncio black isort mypy bandit
fi

echo ""
echo "[5/8] Creating environment files..."
if [ ! -f ".env.dev" ]; then
    echo "Creating .env.dev file..."
    cat > .env.dev << EOF
# TouriQuest Development Environment Variables
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/touriquest_dev
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=dev-secret-key-change-in-production
ELASTICSEARCH_URL=http://localhost:9200
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
RABBITMQ_URL=amqp://admin:admin@localhost:5672/
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
EOF
    echo "✅ .env.dev file created"
else
    echo "✅ .env.dev file already exists"
fi

echo ""
echo "[6/8] Pulling Docker images..."
if ! docker compose -f docker-compose.dev.yml pull; then
    echo "⚠️  Some images may not be available yet"
fi

echo ""
echo "[7/8] Building and starting services..."
if ! docker compose -f docker-compose.dev.yml up --build -d; then
    echo "❌ Failed to start services"
    exit 1
fi

echo ""
echo "[8/8] Waiting for services to be ready..."
sleep 30

echo ""
echo "==============================================="
echo "   Setup Complete! 🎉"
echo "==============================================="
echo ""
echo "Your development environment is ready!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend:          http://localhost:3000"
echo "   API Gateway:       http://localhost:8000"
echo "   API Documentation: http://localhost:8000/docs"
echo ""
echo "🛠️  Development Tools:"
echo "   RabbitMQ UI:       http://localhost:15672 (admin/admin)"
echo "   MailHog UI:        http://localhost:8025"
echo "   MinIO Console:     http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "📊 Monitoring:"
echo "   Grafana:           http://localhost:3001 (admin/admin)"
echo "   Prometheus:        http://localhost:9090"
echo "   Jaeger:            http://localhost:16686"
echo ""
echo "💡 Available Commands:"
echo "   ./status-dev.sh     - Check status of all services"
echo "   ./logs-dev.sh       - View service logs"
echo "   ./stop-dev.sh       - Stop all services"
echo "   ./clean-dev.sh      - Clean up all containers and data"
echo "   ./reset-dev.sh      - Reset entire environment"
echo ""
echo "Run './status-dev.sh' to verify all services are running properly."
echo ""