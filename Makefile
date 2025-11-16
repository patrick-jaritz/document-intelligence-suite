.PHONY: setup frontend test lint typecheck build supabase deploy-all

setup:
	cd frontend && npm install

frontend:
	cd frontend && npm run dev

test:
	cd frontend && npm run test:run

lint:
	cd frontend && npm run lint

typecheck:
	cd frontend && npm run typecheck

build:
	cd frontend && npm run build

supabase:
	@echo "Start Supabase locally: npm run supabase:start"

deploy-all:
	./scripts/deploy_all.sh
