# Domain Model

## Сущности

### Category (категория блюда)

Справочник. Не зашит в код — хранится в БД.

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK |
| name | String | Уникальное название (напр. «Суп», «Птица») |
| createdAt | DateTime | Дата создания |

Стартовые категории: Завтрак, Суп, Мясо, Птица, Рыба, Паста, Гарнир, Салат, Выпечка, Другое.

---

### Ingredient (ингредиент-справочник)

Нормализованный справочник продуктов. Один Ingredient используется в разных блюдах — это ключ к агрегации в Shopping List.

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK |
| name | String | Уникальное название («Молоко», «Яйцо», «Куриное филе») |
| createdAt | DateTime | Дата создания |

---

### Dish (блюдо)

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK |
| name | String | Название блюда |
| categoryId | Int | FK → Category |
| difficulty | Difficulty | EASY / MEDIUM / HARD |
| servings | Int | На сколько порций рассчитан базовый рецепт |
| recipe | String? | Текст рецепта (необязательный) |
| calories | Float? | КБЖУ: ккал на 100г (вводится вручную) |
| protein | Float? | Белки на 100г |
| fat | Float? | Жиры на 100г |
| carbs | Float? | Углеводы на 100г |
| forBreakfast | Boolean | Можно использовать на завтрак |
| forLunch | Boolean | Можно использовать на обед |
| lastCookedAt | DateTime? | **Кэш** — дата последней записи CookingHistory (обновляется через syncCookingHistory()) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Блюдо может быть одновременно `forBreakfast=true` и `forLunch=true`.

---

### DishIngredient (ингредиент в блюде)

Связь блюда с ингредиентом + количество.

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK |
| dishId | Int | FK → Dish (cascade delete) |
| ingredientId | Int | FK → Ingredient (restrict) |
| amount | Float | Количество (>0) |
| unit | Unit | Единица измерения |

Уникальность: `(dishId, ingredientId)` — один ингредиент один раз в блюде.

---

### WeeklyMenu (меню на неделю)

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK |
| weekStart | DateTime | Понедельник 00:00 UTC (уникальный) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Текущее меню определяется по `weekStart` == начало текущей недели.
Старые меню **не удаляются** — хранятся как архив (ADR-012).

---

### MenuItem (элемент меню)

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK |
| menuId | Int | FK → WeeklyMenu (cascade delete) |
| dishId | Int | FK → Dish (restrict) |
| mealType | MealType | BREAKFAST / LUNCH |
| date | DateTime | Конкретный день (UTC) |

Уникальность: `(menuId, date, mealType)` — один завтрак и один обед в день.

Ужин не хранится — Frontend показывает обед как ужин.

---

### ShoppingItem (элемент списка покупок)

Денормализованный кэш. Производные данные от MenuItem → Dish → DishIngredient.

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK |
| menuId | Int | FK → WeeklyMenu (cascade delete) |
| ingredientId | Int | FK → Ingredient (restrict) |
| totalAmount | Float | Агрегированное количество в **базовой единице** |
| unit | Unit | Базовая единица: только GRAM, MILLILITER или PIECE (ADR-009) |
| isPurchased | Boolean | Куплено / не куплено |

Уникальность: `(menuId, ingredientId, unit)` — один ингредиент в одной базовой единице.

При пересчёте: полное удаление + вставка новых строк с восстановлением `isPurchased`.

---

### ShoppingItemDate (дата необходимости продукта)

Нормализованная связь ShoppingItem → конкретный день (ADR-010).

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK |
| shoppingItemId | Int | FK → ShoppingItem (cascade delete) |
| neededAt | DateTime | Дата, когда ингредиент нужен (UTC) |

Связь: `ShoppingItem 1──N ShoppingItemDate`

Пример: молоко нужно в понедельник, среду и субботу → 3 записи ShoppingItemDate.

---

### CookingHistory (история приготовления)

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK |
| dishId | Int | FK → Dish (cascade delete) |
| cookedAt | DateTime | Дата приготовления |
| menuItemId | Int? | FK → MenuItem nullable (SetNull при удалении) |

**Источник истины.** `Dish.lastCookedAt` — лишь кэш последней записи.

Создаётся автоматически через `syncCookingHistory(menuId)`, которая вызывается при запросах меню.

---

### Settings (настройки приложения)

Singleton (одна строка).

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK (autoincrement, всегда 1 строка) |
| familySize | Int | Количество человек (default: 3) |
| mealsPerDay | Int | Количество планируемых приёмов пищи (default: 2) |
| daySettings | Json | Record<DayOfWeek, DaySettings> |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Важно:** `targetServings` не хранится. Вычисляется как `familySize × mealsPerDay` (ADR-011).

---

## Enums

### MealType
```
BREAKFAST — завтрак
LUNCH     — обед
```

### Difficulty
```
EASY   — простое
MEDIUM — среднее
HARD   — сложное
```

### Unit
```
GRAM       — г  (базовая единица для веса)
KILOGRAM   — кг (конвертируется в GRAM при агрегации)
MILLILITER — мл (базовая единица для объёма)
LITER      — л  (конвертируется в MILLILITER при агрегации)
PIECE      — шт (отдельная группа, без конвертации)
```

---

## ER-диаграмма

```
Category 1──N Dish
Dish     1──N DishIngredient N──1 Ingredient
Dish     1──N CookingHistory

WeeklyMenu 1──N MenuItem      N──1 Dish
WeeklyMenu 1──N ShoppingItem  N──1 Ingredient

ShoppingItem 1──N ShoppingItemDate

MenuItem 1──N CookingHistory (nullable)
```

---

## Бизнес-правила

### Генерация меню
1. Завтраки **могут** повторяться в течение недели
2. Обеды **не должны** повторяться в течение одной недели
3. Сложность блюда должна соответствовать ограничениям дня (потолок, не требование)
4. Блюда с `forBreakfast=false` не попадают в завтраки
5. Блюда с `forLunch=false` не попадают в обеды
6. Наиболее ограниченные дни планируются первыми (ADR-013)
7. При нехватке блюд — явная ошибка (не молчаливое нарушение правил)
8. `POST /menus/generate` возвращает 409 если меню на неделю уже существует (ADR-012)

### Расчёт порций
- `targetServings = familySize × mealsPerDay` (не хранится, вычисляется — ADR-011)
- `scaleFactor = targetServings / dish.servings`
- `scaledAmount = ingredient.amount × scaleFactor`

### Нормализация единиц (ADR-009)
- При агрегации Shopping List: конвертировать к базовой единице (г, мл)
- KILOGRAM → GRAM (×1000), LITER → MILLILITER (×1000)
- PIECE — не конвертируется
- При отображении: ≥ 1000 г → кг, ≥ 1000 мл → л

### Агрегация Shopping List
- Один и тот же Ingredient в совместимых Unit — нормализуются и суммируются
- Один и тот же Ingredient в несовместимых Unit (GRAM + PIECE) — отдельные строки
- `ShoppingItemDate` хранит все даты, когда ингредиент нужен

### История (ADR-014)
- `Dish.lastCookedAt` — кэш, производное от последней записи CookingHistory
- `CookingHistory` — единственный источник истины о датах приготовления
- Синхронизация: `syncCookingHistory(menuId)` в `menuService.ts`
- Вызывается явно, не через cron
