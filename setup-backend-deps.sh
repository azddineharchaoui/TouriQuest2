#!/bin/bash
# Alternative backend setup that avoids the package discovery issue

echo "Setting up backend dependencies (alternative approach)..."

# Install common development tools
echo "Installing development tools..."
pip3 install --upgrade pip setuptools wheel

# Install testing and code quality tools
echo "Installing testing and linting tools..."
pip3 install \
    pytest>=7.0.0 \
    pytest-cov>=4.0.0 \
    pytest-asyncio>=0.21.0 \
    black>=23.0.0 \
    isort>=5.12.0 \
    mypy>=1.0.0 \
    bandit>=1.7.0

# Install common backend dependencies
echo "Installing common backend dependencies..."
pip3 install \
    fastapi \
    uvicorn \
    pydantic \
    sqlalchemy \
    alembic \
    asyncpg \
    redis \
    aio-pika \
    python-multipart \
    python-jose \
    passlib \
    bcrypt

echo "✅ Backend dependencies installed successfully!"
echo ""
echo "Note: Individual services will install their specific dependencies"
echo "when Docker containers are built."