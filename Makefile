# =============================================================================
# TouriQuest Development Makefile
# =============================================================================

.PHONY: help setup-dev build test deploy clean

# Default target
.DEFAULT_GOAL := help

# Colors for output
YELLOW := \033[1;33m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m

## Show this help message
help:
	@echo "$(YELLOW)TouriQuest Development Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make $(GREEN)<target>$(NC)\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

## Set up development environment
setup-dev: ## Set up development environment with Docker Compose
	@echo "$(YELLOW)Setting up development environment...$(NC)"
	@chmod +x scripts/ci-cd.sh
	@./scripts/ci-cd.sh setup-dev

## Install Python dependencies
install: ## Install Python dependencies with Poetry
	@echo "$(YELLOW)Installing Python dependencies...$(NC)"
	@poetry install --with dev,test
	@pre-commit install

## Format code
format: ## Format code with Black and isort
	@echo "$(YELLOW)Formatting code...$(NC)"
	@black .
	@isort .

## Lint code
lint: ## Lint code with flake8, pylint, and mypy
	@echo "$(YELLOW)Linting code...$(NC)"
	@flake8 .
	@pylint src/
	@mypy src/

## Run security checks
security: ## Run security checks with bandit and safety
	@echo "$(YELLOW)Running security checks...$(NC)"
	@bandit -r src/
	@safety check

## Run pre-commit hooks
pre-commit: ## Run all pre-commit hooks
	@echo "$(YELLOW)Running pre-commit hooks...$(NC)"
	@pre-commit run --all-files

## Run unit tests
test-unit: ## Run unit tests with pytest
	@echo "$(YELLOW)Running unit tests...$(NC)"
	@pytest tests/unit/ -v --cov=src --cov-report=html

## Run integration tests
test-integration: ## Run integration tests
	@echo "$(YELLOW)Running integration tests...$(NC)"
	@pytest tests/integration/ -v

## Run E2E tests
test-e2e: ## Run end-to-end tests
	@echo "$(YELLOW)Running E2E tests...$(NC)"
	@pytest tests/e2e/ -v

## Run all tests
test: test-unit test-integration test-e2e ## Run complete test suite
	@echo "$(GREEN)All tests completed!$(NC)"

## Run load tests
load-test: ## Run load tests with Locust
	@echo "$(YELLOW)Running load tests...$(NC)"
	@locust -f tests/load/locustfile.py --headless --users 50 --spawn-rate 5 --run-time 2m --host http://localhost:8000

## Build Docker images
build: ## Build all Docker images
	@echo "$(YELLOW)Building Docker images...$(NC)"
	@./scripts/ci-cd.sh build-images

## Start development services
dev-up: ## Start development services with Docker Compose
	@echo "$(YELLOW)Starting development services...$(NC)"
	@docker-compose -f docker-compose.dev.yml up -d

## Stop development services
dev-down: ## Stop development services
	@echo "$(YELLOW)Stopping development services...$(NC)"
	@docker-compose -f docker-compose.dev.yml down

## View development logs
dev-logs: ## View logs from development services
	@docker-compose -f docker-compose.dev.yml logs -f

## Database migrations
migrate: ## Run database migrations
	@echo "$(YELLOW)Running database migrations...$(NC)"
	@alembic upgrade head

## Create new migration
migration: ## Create new database migration
	@echo "$(YELLOW)Creating new migration...$(NC)"
	@read -p "Migration message: " message; alembic revision --autogenerate -m "$$message"

## Reset database
db-reset: ## Reset database (WARNING: This will delete all data)
	@echo "$(RED)WARNING: This will delete all database data!$(NC)"
	@read -p "Are you sure? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		alembic downgrade base && alembic upgrade head; \
		echo "$(GREEN)Database reset completed$(NC)"; \
	else \
		echo "Database reset cancelled"; \
	fi

## Deploy to staging
deploy-staging: ## Deploy to staging environment
	@echo "$(YELLOW)Deploying to staging...$(NC)"
	@./scripts/ci-cd.sh deploy-staging

## Deploy to production
deploy-prod: ## Deploy to production environment
	@echo "$(YELLOW)Deploying to production...$(NC)"
	@./scripts/ci-cd.sh deploy-prod

## Rollback deployment
rollback: ## Rollback deployment
	@echo "$(YELLOW)Rolling back deployment...$(NC)"
	@./scripts/ci-cd.sh rollback

## Check system health
health: ## Check system health
	@echo "$(YELLOW)Checking system health...$(NC)"
	@./scripts/ci-cd.sh health-check

## Clean up resources
clean: ## Clean up Docker and Kubernetes resources
	@echo "$(YELLOW)Cleaning up resources...$(NC)"
	@./scripts/ci-cd.sh cleanup

## Generate API documentation
docs: ## Generate API documentation
	@echo "$(YELLOW)Generating API documentation...$(NC)"
	@python -c "from src.api_gateway.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > docs/openapi.json

## Start monitoring stack
monitoring-up: ## Start monitoring stack (Prometheus, Grafana, etc.)
	@echo "$(YELLOW)Starting monitoring stack...$(NC)"
	@docker-compose -f docker-compose.dev.yml up -d prometheus grafana jaeger

## Generate SSL certificates for development
ssl-dev: ## Generate SSL certificates for development
	@echo "$(YELLOW)Generating development SSL certificates...$(NC)"
	@mkdir -p docker/nginx/ssl
	@openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout docker/nginx/ssl/dev.key \
		-out docker/nginx/ssl/dev.crt \
		-subj "/CN=localhost"

## View resource usage
resources: ## View Docker resource usage
	@echo "$(YELLOW)Docker resource usage:$(NC)"
	@docker stats --no-stream

## Backup database
db-backup: ## Create database backup
	@echo "$(YELLOW)Creating database backup...$(NC)"
	@mkdir -p backups
	@docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres touriquest_dev > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Database backup created in backups/$(NC)"

## Restore database from backup
db-restore: ## Restore database from backup
	@echo "$(YELLOW)Restoring database from backup...$(NC)"
	@ls backups/*.sql
	@read -p "Enter backup filename: " filename; \
	docker-compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d touriquest_dev < backups/$$filename

## Performance profile
profile: ## Run performance profiling
	@echo "$(YELLOW)Running performance profiling...$(NC)"
	@python -m pytest tests/performance/ --benchmark-only

## Code coverage report
coverage: ## Generate detailed coverage report
	@echo "$(YELLOW)Generating coverage report...$(NC)"
	@pytest tests/unit/ --cov=src --cov-report=html --cov-report=term-missing
	@echo "$(GREEN)Coverage report generated in htmlcov/$(NC)"

## Update dependencies
update-deps: ## Update Python dependencies
	@echo "$(YELLOW)Updating dependencies...$(NC)"
	@poetry update
	@pre-commit autoupdate

## Check outdated dependencies
check-deps: ## Check for outdated dependencies
	@echo "$(YELLOW)Checking for outdated dependencies...$(NC)"
	@poetry show --outdated

## Run security audit
audit: ## Run comprehensive security audit
	@echo "$(YELLOW)Running security audit...$(NC)"
	@bandit -r src/ -f json -o security-report.json
	@safety check --json --output safety-report.json
	@echo "$(GREEN)Security reports generated$(NC)"

## Setup IDE configuration
ide-setup: ## Setup IDE configuration files
	@echo "$(YELLOW)Setting up IDE configuration...$(NC)"
	@mkdir -p .vscode
	@echo '{"python.defaultInterpreterPath": ".venv/bin/python", "python.formatting.provider": "black", "python.linting.enabled": true, "python.linting.flake8Enabled": true}' > .vscode/settings.json

## Quick start (setup + run)
quickstart: setup-dev dev-up ## Quick start: setup and run development environment
	@echo "$(GREEN)TouriQuest development environment is ready!$(NC)"
	@echo "$(GREEN)Access the application at: http://localhost:8000$(NC)"