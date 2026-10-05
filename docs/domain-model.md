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
| lastCookedAt | DateTime? | Когда последний раз готовилось (автообновление) |
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
| ingredientId | Int | FK → Ingredient |
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

---

### MenuItem (элемент меню)

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK |
| menuId | Int | FK → WeeklyMenu (cascade delete) |
| dishId | Int | FK → Dish |
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
| ingredientId | Int | FK → Ingredient |
| totalAmount | Float | Агрегированное количество |
| unit | Unit | Единица измерения |
| isPurchased | Boolean | Куплено / не куплено |
| neededOnDates | DateTime[] | Дни, когда нужен ингредиент |

Уникальность: `(menuId, ingredientId, unit)` — один ингредиент в одной единице.

При пересчёте: полное удаление + вставка новых строк с восстановлением `isPurchased`.

---

### CookingHistory (история приготовления)

| Поле | Тип | Описание |
|------|-----|---------|
| id | Int | PK |
| dishId | Int | FK → Dish |
| cookedAt | DateTime | Дата приготовления |
| menuItemId | Int? | FK → MenuItem (если из меню) |

Создаётся автоматически при обнаружении MenuItem с датой в прошлом.
После записи обновляется `Dish.lastCookedAt`.

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
GRAM       — г
KILOGRAM   — кг
MILLILITER — мл
LITER      — л
PIECE      — шт
```

### DishCategory (справочные значения для seed)
```
BREAKFAST — Завтрак
SOUP      — Суп
MEAT      — Мясо
POULTRY   — Птица
FISH      — Рыба
PASTA     — Паста
SIDE_DISH — Гарнир
SALAD     — Салат
BAKING    — Выпечка
OTHER     — Другое
```

---

## ER-диаграмма

```
Category 1──N Dish
Dish     1──N DishIngredient N──1 Ingredient
Dish     1──N CookingHistory

WeeklyMenu 1──N MenuItem      N──1 Dish
WeeklyMenu 1──N ShoppingItem  N──1 Ingredient
```

---

## Бизнес-правила

### Генерация меню
1. Завтраки **могут** повторяться в течение недели
2. Обеды **не должны** повторяться в течение одной недели
3. Сложность блюда должна соответствовать ограничениям дня
4. Блюда с `forBreakfast=false` не попадают в завтраки
5. Блюда с `forLunch=false` не попадают в обеды
6. При нехватке блюд — явная ошибка (не молчаливое нарушение правил)

### Расчёт порций
- `targetServings = familySize × mealsPerDay = 3 × 2 = 6`
- `scaleFactor = targetServings / dish.servings`
- `scaledAmount = ingredient.amount × scaleFactor`

### Агрегация Shopping List
- Один и тот же Ingredient в одной Unit — суммируются
- Один и тот же Ingredient в разных Unit — конвертируются (г↔кг, мл↔л), затем суммируются
- Итоговое количество отображается в наиболее удобной единице

### История
- `Dish.lastCookedAt` обновляется при создании записи CookingHistory
- Блюда давно не использованные имеют больший вес при генерации
- История обновляется автоматически (не требует действий пользователя)
