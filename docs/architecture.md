# Architecture

## Обзор

Монолитное приложение с чётким разделением слоёв.
Никаких микросервисов, очередей, Redis.
Корректность и простота — выше производительности.

## Слои

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Vite + React + TS)            │
│   MenuPage │ ShoppingPage │ DishesPage               │
└──────────────────────────┬──────────────────────────┘
                           │ HTTP/JSON REST API
┌──────────────────────────▼──────────────────────────┐
│             Backend (Express + Node.js + TS)         │
│  ┌───────────────────────────────────────────────┐   │
│  │         Domain Layer (pure TypeScript)        │   │
│  │  menuGenerator │ shoppingListBuilder           │   │
│  │  ingredientScaler │ historyWeighter            │   │
│  └───────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────┐   │
│  │         Data Layer (Prisma ORM)               │   │
│  └───────────────────────┬───────────────────────┘   │
└──────────────────────────┼──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                    PostgreSQL                        │
└─────────────────────────────────────────────────────┘
```

## Domain Layer

**Правило:** Domain Layer не зависит ни от чего внешнего.

Содержит чистые функции:

| Модуль | Ответственность |
|--------|----------------|
| `menuGenerator` | Генерация меню на неделю |
| `shoppingListBuilder` | Агрегация ингредиентов из MenuItems |
| `ingredientScaler` | Масштабирование количества порций |
| `historyWeighter` | Расчёт весов блюд на основе истории |

Все функции тестируются без БД, HTTP и React.

## Data Layer

Prisma ORM + PostgreSQL.
Репозитории инкапсулируют запросы к БД.
Domain-логика не знает о Prisma.

## API Layer

Express routes → Services → Domain + Data.

Валидация входных данных — Zod (используется из `packages/shared`).
Backend является источником истины для всех правил.

## Frontend

React + Vite + TypeScript.
Типы берутся из `packages/shared`.
Бизнес-логика (генерация, агрегация) — только на backend.

## Shared Package

`packages/shared` содержит:
- Enums: `MealType`, `Difficulty`, `Unit`, `DishCategory`
- DTO-типы для API-запросов и ответов
- Zod-схемы (используются на backend для валидации, на frontend — опционально)

## Структура проекта

```
make-me-menu/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── domain/         ← чистая бизнес-логика
│   │   │   ├── routes/         ← Express-роуты
│   │   │   ├── services/       ← оркестрация domain + data
│   │   │   ├── db/             ← Prisma client
│   │   │   └── app.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── tests/
│   │       ├── domain/         ← unit-тесты domain layer
│   │       └── integration/    ← интеграционные тесты API
│   └── frontend/
│       └── src/
│           ├── pages/
│           ├── components/
│           ├── api/            ← HTTP-клиент
│           └── hooks/
├── packages/
│   └── shared/
│       └── src/
│           ├── types/
│           ├── enums/
│           └── schemas/
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── docs/
```

## Зависимости между пакетами

```
frontend  → shared (типы, enums)
backend   → shared (типы, enums, схемы валидации)
shared    → ничего (только внешние зависимости: zod)
```
