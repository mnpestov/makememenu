# Make Me Menu Planner

Семейное приложение для планирования меню и списка покупок.

## Проблема

Каждые выходные семья тратит значительное время на:
- Составление меню на неделю
- Расчёт количества продуктов
- Составление списка покупок

## Решение

Приложение автоматизирует планирование: генерирует меню на неделю с учётом истории блюд и сложности, автоматически формирует список покупок.

## Архитектура

Monorepo (pnpm workspaces):

```
apps/backend   — Express + Node.js + TypeScript + Prisma
apps/frontend  — React + TypeScript + Vite
packages/shared — общие типы, enums, DTO
```

База данных: PostgreSQL

## Документация

- [product.md](docs/product.md) — продуктовые требования
- [architecture.md](docs/architecture.md) — архитектура
- [domain-model.md](docs/domain-model.md) — доменная модель
- [api.md](docs/api.md) — API-контракты
- [decisions.md](docs/decisions.md) — журнал архитектурных решений

## Запуск

```bash
# Установка зависимостей
pnpm install

# Запуск БД (Docker)
docker-compose up -d

# Миграции
pnpm --filter backend prisma migrate dev

# Seed
pnpm --filter backend prisma db seed

# Разработка (frontend + backend)
pnpm dev
```

## Требования

- Node.js >= 20
- pnpm >= 9
- Docker (для PostgreSQL)
