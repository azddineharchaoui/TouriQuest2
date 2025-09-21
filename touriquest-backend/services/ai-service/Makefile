# AI Service - Makefile
# Development and deployment commands for TouriQuest AI Service

.PHONY: help install dev-install test lint format type-check security-check clean build run run-dev docker-build docker-run docker-dev setup-env migrate

# Default target
help:
	@echo "TouriQuest AI Service - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  install         Install production dependencies"
	@echo "  dev-install     Install development dependencies"
	@echo "  run             Run production server"
	@echo "  run-dev         Run development server with hot reload"
	@echo "  test            Run all tests"
	@echo "  lint            Run linting checks"
	@echo "  format          Format code with black and isort"
	@echo "  type-check      Run type checking with mypy"
	@echo "  security-check  Run security vulnerability checks"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build    Build production Docker image"
	@echo "  docker-dev      Start development environment with Docker"
	@echo "  docker-prod     Start production environment with Docker"
	@echo "  docker-run      Run production container"
	@echo ""
	@echo "Database:"
	@echo "  migrate         Run database migrations"
	@echo "  migrate-gen     Generate new migration"
	@echo ""
	@echo "Utilities:"
	@echo "  setup-env       Set up environment files"
	@echo "  clean           Clean up build artifacts"
	@echo "  logs            View Docker logs"

# Installation
install:
	pip install --upgrade pip setuptools wheel
	pip install -e .

dev-install: install
	pip install pytest pytest-asyncio pytest-cov black isort mypy bandit safety

# Environment setup
setup-env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env file from .env.example"; \
		echo "Please edit .env with your configuration"; \
	else \
		echo ".env file already exists"; \
	fi

# Development server
run:
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

run-dev:
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug

# Testing
test:
	pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing

test-unit:
	pytest tests/unit/ -v

test-integration:
	pytest tests/integration/ -v

test-watch:
	pytest-watch tests/ -c pytest.ini

# Code quality
lint:
	@echo "Running flake8..."
	flake8 app/ tests/
	@echo "Running bandit security check..."
	bandit -r app/ -f json -o bandit-report.json || true

format:
	@echo "Formatting with black..."
	black app/ tests/
	@echo "Sorting imports with isort..."
	isort app/ tests/

type-check:
	mypy app/ --config-file pyproject.toml

security-check:
	@echo "Checking for known security vulnerabilities..."
	safety check
	@echo "Running bandit security linter..."
	bandit -r app/

# Docker commands
docker-build:
	docker build -t touriquest-ai-service .

docker-build-dev:
	docker build -f Dockerfile.dev -t touriquest-ai-service:dev .

docker-dev: setup-env
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Development environment started!"
	@echo "AI Service: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

docker-prod: setup-env
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Production environment started!"

docker-run:
	docker run -p 8000:8000 --env-file .env touriquest-ai-service

docker-stop:
	docker-compose -f docker-compose.dev.yml down
	docker-compose -f docker-compose.prod.yml down

docker-logs:
	docker-compose -f docker-compose.dev.yml logs -f ai-service

docker-shell:
	docker-compose -f docker-compose.dev.yml exec ai-service bash

# Database
migrate:
	alembic upgrade head

migrate-gen:
	@read -p "Enter migration message: " msg; \
	alembic revision --autogenerate -m "$$msg"

migrate-rollback:
	alembic downgrade -1

# Utilities
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true

logs:
	docker-compose -f docker-compose.dev.yml logs -f

logs-prod:
	docker-compose -f docker-compose.prod.yml logs -f

# Health check
health:
	@curl -f http://localhost:8000/health || echo "Service not running or not healthy"

# Quick development workflow
dev: setup-env docker-dev
	@echo "Development environment ready!"
	@echo "Run 'make logs' to view logs"
	@echo "Run 'make docker-stop' to stop services"

# Production deployment
deploy: docker-build
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Production deployment complete!"

# Full CI/CD pipeline simulation
ci: clean dev-install lint type-check security-check test
	@echo "CI pipeline completed successfully!"

# Emergency commands
emergency-stop:
	docker stop $$(docker ps -q --filter "name=touriquest") 2>/dev/null || true

emergency-clean: emergency-stop clean
	docker system prune -f
	docker volume prune -f