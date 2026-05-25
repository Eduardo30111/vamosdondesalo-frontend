.PHONY: dev build seed migrate reset studio stop clean logs

dev:
	docker compose up --build

dev-d:
	docker compose up --build -d

build:
	docker compose build

seed:
	docker compose exec api sh -c "cd apps/api && pnpm run seed"

migrate:
	docker compose exec api sh -c "cd apps/api && pnpm run db:migrate"

reset:
	docker compose exec api sh -c "cd apps/api && pnpm run db:reset"

studio:
	docker compose exec api sh -c "cd apps/api && pnpm run db:studio"

stop:
	docker compose down

clean:
	docker compose down -v

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-web:
	docker compose logs -f web
