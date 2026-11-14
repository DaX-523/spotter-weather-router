# Developer entry points for the monorepo. Run `make` to list targets.
.DEFAULT_GOAL := help
NODE_MAJOR := 24

.PHONY: help install dev-backend dev-frontend test format check check-backend check-deploy-settings check-frontend require-node require-env

help: ## List available targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  %-15s %s\n", $$1, $$2}'

install: require-node ## Install backend and frontend dependencies
	cd backend && uv sync
	cd frontend && npm install

dev-backend: require-env ## Run the API with auto-reload on http://localhost:8000 (reads backend/.env)
	cd backend && uv run --env-file .env python manage.py runserver

dev-frontend: require-node ## Run the web app on http://localhost:5173 (proxies /api to the API)
	cd frontend && npm run dev

test: require-node ## Run all tests (no coverage, fast feedback)
	cd backend && uv run pytest
	cd frontend && npm test

format: require-node ## Auto-format and auto-fix lint issues in both apps
	cd backend && uv run ruff format . && uv run ruff check --fix .
	cd frontend && npm run format && npm run lint -- --fix

check: check-backend check-frontend ## Full quality gate for both apps (must pass before done)

check-backend: ## Backend: lint, format check, type check, Django checks, tests + coverage gate
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy \
		&& DJANGO_SETTINGS_MODULE=config.settings_test uv run python manage.py check
	@$(MAKE) --no-print-directory check-deploy-settings
	cd backend && uv run pytest --cov

# Django's deployment checklist against the runtime settings, with production-like values (a
# throwaway secret, no real key), so a setting that is unsafe in production fails the gate.
check-deploy-settings:
	cd backend && DJANGO_SECRET_KEY="$$(uv run python -c 'import secrets; print(secrets.token_urlsafe(50))')" \
		TOMTOM_API_KEY=check-only DJANGO_DEBUG=false \
		uv run python manage.py check --deploy --fail-level WARNING

check-frontend: require-node ## Frontend: lint, format check, type check, tests + coverage gate
	cd frontend && npm run check

require-node:
	@node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= $(NODE_MAJOR) ? 0 : 1)' || \
		{ echo "Node $(NODE_MAJOR)+ is required (found $$(node --version)). Run: nvm use $(NODE_MAJOR)"; exit 1; }

require-env:
	@test -f backend/.env || \
		{ echo "Missing backend/.env. Run: cp backend/.env.example backend/.env, then set DJANGO_SECRET_KEY"; exit 1; }
