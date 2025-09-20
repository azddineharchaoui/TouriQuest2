.PHONY: help dev test lint clean build migrate deploy-dev deploy-staging deploy-prod

# Colors for output
YELLOW := \033[33m
GREEN := \033[32m
RESET := \033[0m

help: ## Show this help message
	@echo "$(YELLOW)TouriQuest Backend - Available Commands:$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "$(YELLOW)Installing dependencies...$(RESET)"
	poetry install
	pre-commit install

dev: ## Start development environment
	@echo "$(YELLOW)Starting development environment...$(RESET)"
	docker-compose up -d postgres redis elasticsearch rabbitmq
	@echo "Waiting for services to be ready..."
	@sleep 10
	docker-compose up -d api-gateway auth-service user-service property-service

dev-full: ## Start all services in development mode
	@echo "$(YELLOW)Starting all services...$(RESET)"
	docker-compose up -d

stop: ## Stop all services
	@echo "$(YELLOW)Stopping all services...$(RESET)"
	docker-compose down

restart: ## Restart all services
	@echo "$(YELLOW)Restarting all services...$(RESET)"
	docker-compose restart

logs: ## Show logs for all services
	docker-compose logs -f

logs-service: ## Show logs for specific service (usage: make logs-service SERVICE=auth-service)
	docker-compose logs -f $(SERVICE)

test: ## Run all tests
	@echo "$(YELLOW)Running tests...$(RESET)"
	poetry run pytest tests/ -v --cov=shared --cov=services

test-unit: ## Run unit tests only
	@echo "$(YELLOW)Running unit tests...$(RESET)"
	poetry run pytest services/*/tests/ -v

test-integration: ## Run integration tests only
	@echo "$(YELLOW)Running integration tests...$(RESET)"
	poetry run pytest tests/ -v

test-load: ## Run load tests
	@echo "$(YELLOW)Running load tests...$(RESET)"
	poetry run locust -f tests/load/locustfile.py --headless -u 100 -r 10 -t 60s --host http://localhost:8000

lint: ## Run linting and formatting
	@echo "$(YELLOW)Running linting and formatting...$(RESET)"
	poetry run black .
	poetry run isort .
	poetry run flake8 .
	poetry run mypy shared/ services/

lint-check: ## Check linting without fixing
	@echo "$(YELLOW)Checking linting...$(RESET)"
	poetry run black --check .
	poetry run isort --check .
	poetry run flake8 .
	poetry run mypy shared/ services/

security-check: ## Run security checks
	@echo "$(YELLOW)Running security checks...$(RESET)"
	poetry run bandit -r shared/ services/ -f json -o security-report.json
	poetry run safety check

migrate: ## Run database migrations
	@echo "$(YELLOW)Running database migrations...$(RESET)"
	poetry run alembic upgrade head

migrate-create: ## Create new migration (usage: make migrate-create MESSAGE="description")
	@echo "$(YELLOW)Creating new migration...$(RESET)"
	poetry run alembic revision --autogenerate -m "$(MESSAGE)"

build: ## Build Docker images
	@echo "$(YELLOW)Building Docker images...$(RESET)"
	docker-compose build

build-service: ## Build specific service (usage: make build-service SERVICE=auth-service)
	@echo "$(YELLOW)Building $(SERVICE)...$(RESET)"
	docker-compose build $(SERVICE)

clean: ## Clean up containers, volumes, and images
	@echo "$(YELLOW)Cleaning up...$(RESET)"
	docker-compose down -v --remove-orphans
	docker system prune -f

clean-all: ## Clean everything including images
	@echo "$(YELLOW)Cleaning everything...$(RESET)"
	docker-compose down -v --remove-orphans
	docker system prune -af

setup-db: ## Setup database with initial data
	@echo "$(YELLOW)Setting up database...$(RESET)"
	poetry run python scripts/setup_database.py

seed-data: ## Seed database with sample data
	@echo "$(YELLOW)Seeding database...$(RESET)"
	poetry run python scripts/seed_data.py

backup-db: ## Backup database
	@echo "$(YELLOW)Backing up database...$(RESET)"
	docker exec touriquest-postgres pg_dump -U postgres touriquest > backup_$(shell date +%Y%m%d_%H%M%S).sql

restore-db: ## Restore database (usage: make restore-db FILE=backup.sql)
	@echo "$(YELLOW)Restoring database...$(RESET)"
	docker exec -i touriquest-postgres psql -U postgres touriquest < $(FILE)

docs: ## Generate API documentation
	@echo "$(YELLOW)Generating API documentation...$(RESET)"
	poetry run python scripts/generate_docs.py

docs-serve: ## Serve documentation locally
	@echo "$(YELLOW)Serving documentation...$(RESET)"
	cd docs && python -m http.server 8080

# Deployment Commands
deploy-dev: ## Deploy to development environment
	@echo "$(YELLOW)Deploying to development...$(RESET)"
	kubectl apply -f k8s/environments/dev/

deploy-staging: ## Deploy to staging environment
	@echo "$(YELLOW)Deploying to staging...$(RESET)"
	kubectl apply -f k8s/environments/staging/

deploy-prod: ## Deploy to production environment
	@echo "$(YELLOW)Deploying to production...$(RESET)"
	kubectl apply -f k8s/environments/prod/

# Monitoring Commands
metrics: ## Show Prometheus metrics
	@echo "$(YELLOW)Opening Prometheus...$(RESET)"
	open http://localhost:9090

grafana: ## Open Grafana dashboard
	@echo "$(YELLOW)Opening Grafana...$(RESET)"
	open http://localhost:3000

# Development Utilities
shell: ## Access service shell (usage: make shell SERVICE=auth-service)
	docker-compose exec $(SERVICE) /bin/bash

db-shell: ## Access database shell
	docker-compose exec postgres psql -U postgres touriquest

redis-shell: ## Access Redis shell
	docker-compose exec redis redis-cli

elastic-shell: ## Access Elasticsearch
	curl http://localhost:9200/_cluster/health?pretty

format: ## Format code
	@echo "$(YELLOW)Formatting code...$(RESET)"
	poetry run black .
	poetry run isort .

check: ## Run all checks (lint, test, security)
	@echo "$(YELLOW)Running all checks...$(RESET)"
	$(MAKE) lint-check
	$(MAKE) test
	$(MAKE) security-check

pre-commit: ## Run pre-commit hooks
	@echo "$(YELLOW)Running pre-commit hooks...$(RESET)"
	poetry run pre-commit run --all-files

# Health Checks
health: ## Check health of all services
	@echo "$(YELLOW)Checking service health...$(RESET)"
	curl -f http://localhost:8000/health || echo "API Gateway: FAILED"
	curl -f http://localhost:8001/health || echo "Auth Service: FAILED"
	curl -f http://localhost:8002/health || echo "User Service: FAILED"
	curl -f http://localhost:8003/health || echo "Property Service: FAILED"

monitor: ## Show live service status
	watch -n 2 'docker-compose ps'

# Default target
.DEFAULT_GOAL := help