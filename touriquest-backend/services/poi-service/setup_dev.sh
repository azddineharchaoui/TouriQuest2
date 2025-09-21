#!/bin/bash

# POI Service Development Setup Script

echo "Setting up TouriQuest POI Service development environment..."

# Check if poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "Poetry not found. Please install poetry first:"
    echo "curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Check if Python 3.11+ is available
python_version=$(python3 --version 2>&1 | grep -oP '\d+\.\d+')
if [[ $(echo "$python_version < 3.11" | bc -l) -eq 1 ]]; then
    echo "Python 3.11+ is required. Current version: $python_version"
    exit 1
fi

# Create and activate virtual environment
echo "Creating virtual environment..."
poetry env use python3.11
poetry install

# Create necessary directories
echo "Creating upload directories..."
mkdir -p uploads/{images/{originals,thumbnails,processed},audio,video,models,temp}

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/touriquest_poi

# Redis
REDIS_URL=redis://localhost:6379/2

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Media Storage
MEDIA_UPLOAD_PATH=./uploads
MEDIA_BASE_URL=http://localhost:8000/media
MAX_UPLOAD_SIZE_MB=10

# Security (change in production!)
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# External APIs (optional)
GOOGLE_MAPS_API_KEY=
OPENAI_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Application
DEBUG=true
LOG_LEVEL=INFO
ENVIRONMENT=development
EOF
    echo "Created .env file. Please update the values as needed."
fi

# Setup database (PostgreSQL with PostGIS)
echo "Setting up database..."
echo "Make sure PostgreSQL with PostGIS extension is running."
echo "You can use Docker:"
echo "docker run --name postgres-postgis -e POSTGRES_PASSWORD=password -e POSTGRES_DB=touriquest_poi -p 5432:5432 -d postgis/postgis:15-3.3"

# Setup Redis
echo "Setting up Redis..."
echo "Make sure Redis is running on port 6379."
echo "You can use Docker:"
echo "docker run --name redis -p 6379:6379 -d redis:7-alpine"

# Setup Elasticsearch
echo "Setting up Elasticsearch..."
echo "Make sure Elasticsearch is running on port 9200."
echo "You can use Docker:"
echo "docker run --name elasticsearch -p 9200:9200 -p 9300:9300 -e 'discovery.type=single-node' -e 'xpack.security.enabled=false' -d elasticsearch:8.11.0"

echo ""
echo "Setup complete! Next steps:"
echo "1. Update the .env file with your configuration"
echo "2. Start the required services (PostgreSQL, Redis, Elasticsearch)"
echo "3. Run database migrations: poetry run alembic upgrade head"
echo "4. Start the development server: poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "API will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo "Redoc Documentation: http://localhost:8000/redoc"