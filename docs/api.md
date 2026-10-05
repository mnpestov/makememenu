# API Reference

Base URL: `http://localhost:3000/api`

## Categories

### GET /categories
Список всех категорий.

**Response 200:**
```json
[{ "id": 1, "name": "Суп", "createdAt": "..." }]
```

### POST /categories
Создать категорию.

**Body:** `{ "name": "Десерт" }`  
**Response 201:** `Category`

### DELETE /categories/:id
Удалить категорию (если нет привязанных блюд).

**Response 204**

---

## Ingredients

### GET /ingredients
Список ингредиентов. Поддерживает поиск.

**Query:** `?search=молоко`  
**Response 200:** `Ingredient[]`

### POST /ingredients
Создать ингредиент.

**Body:** `{ "name": "Пармезан" }`  
**Response 201:** `Ingredient`

---

## Dishes

### GET /dishes
Список блюд с фильтрацией.

**Query:** `?category=1&difficulty=EASY&forBreakfast=true&search=паста`  
**Response 200:** `DishSummary[]`

### GET /dishes/:id
Полная карточка блюда с ингредиентами.

**Response 200:** `DishFull`
```json
{
  "id": 1,
  "name": "Паста карбонара",
  "category": { "id": 5, "name": "Паста" },
  "difficulty": "MEDIUM",
  "servings": 3,
  "forBreakfast": false,
  "forLunch": true,
  "recipe": "...",
  "calories": 320,
  "protein": 14,
  "fat": 18,
  "carbs": 28,
  "lastCookedAt": "2026-09-28T00:00:00.000Z",
  "ingredients": [
    { "ingredient": { "id": 3, "name": "Спагетти" }, "amount": 300, "unit": "GRAM" }
  ]
}
```

### POST /dishes
Создать блюдо.

**Body:**
```json
{
  "name": "Паста карбонара",
  "categoryId": 5,
  "difficulty": "MEDIUM",
  "servings": 3,
  "forBreakfast": false,
  "forLunch": true,
  "recipe": "...",
  "calories": 320,
  "protein": 14,
  "fat": 18,
  "carbs": 28,
  "ingredients": [
    { "ingredientId": 3, "amount": 300, "unit": "GRAM" }
  ]
}
```
**Response 201:** `DishFull`

### PUT /dishes/:id
Обновить блюдо (полная замена).

**Body:** аналогично POST  
**Response 200:** `DishFull`

### DELETE /dishes/:id
Удалить блюдо.

**Response 204**

### GET /dishes/:id/history
История приготовления блюда.

**Response 200:**
```json
[{ "id": 1, "cookedAt": "2026-09-28T00:00:00.000Z" }]
```

---

## Menus

### GET /menus/current
Текущее меню с блюдами.

**Response 200:** `WeeklyMenuFull`
```json
{
  "id": 1,
  "weekStart": "2026-10-06T00:00:00.000Z",
  "items": [
    {
      "id": 1,
      "mealType": "BREAKFAST",
      "date": "2026-10-06T00:00:00.000Z",
      "dish": { "id": 2, "name": "Омлет", "difficulty": "EASY", ... }
    }
  ]
}
```

**Response 404** — если меню на текущую неделю не существует.

### GET /menus/:id
Меню по ID.

**Response 200:** `WeeklyMenuFull`

### POST /menus/generate
Сгенерировать меню на текущую неделю (создаёт или перезаписывает).

**Body:**
```json
{
  "weekStart": "2026-10-06T00:00:00.000Z"
}
```

**Response 201:** `WeeklyMenuFull`

**Response 422** — если недостаточно блюд:
```json
{
  "error": "INSUFFICIENT_DISHES",
  "message": "Недостаточно блюд для обеда. Добавьте ещё 4 блюда.",
  "details": { "mealType": "LUNCH", "required": 7, "available": 3 }
}
```

### PUT /menus/:menuId/items/:itemId
Ручная замена блюда в меню.

**Body:** `{ "dishId": 5 }`  
**Response 200:** `MenuItem`

Автоматически пересчитывает Shopping List.

### POST /menus/:menuId/items/:itemId/replace
Случайная замена блюда (алгоритм генератора выбирает подходящее).

**Body:** `{}` (или `{ "excludeDishIds": [2, 3] }` чтобы исключить варианты)  
**Response 200:** `MenuItem`

Автоматически пересчитывает Shopping List.

---

## Shopping List

### GET /menus/:menuId/shopping
Список покупок для меню.

**Response 200:**
```json
[
  {
    "id": 1,
    "ingredient": { "id": 5, "name": "Молоко" },
    "totalAmount": 2,
    "unit": "LITER",
    "isPurchased": false,
    "neededOnDates": ["2026-10-06T00:00:00.000Z", "2026-10-08T00:00:00.000Z"]
  }
]
```

### PATCH /menus/:menuId/shopping/:itemId
Отметить продукт куплен/не куплен.

**Body:** `{ "isPurchased": true }`  
**Response 200:** `ShoppingItem`

### POST /menus/:menuId/shopping/recalculate
Принудительный пересчёт списка покупок.

**Response 200:** `ShoppingItem[]`

---

## Settings

### GET /settings
Текущие настройки.

**Response 200:**
```json
{
  "familySize": 3,
  "mealsPerDay": 2,
  "targetServings": 6,
  "daySettings": {
    "MONDAY":    { "allowedDifficulties": ["EASY", "MEDIUM", "HARD"] },
    "TUESDAY":   { "allowedDifficulties": ["EASY", "MEDIUM", "HARD"] },
    "WEDNESDAY": { "allowedDifficulties": ["EASY", "MEDIUM"] },
    "THURSDAY":  { "allowedDifficulties": ["EASY", "MEDIUM"] },
    "FRIDAY":    { "allowedDifficulties": ["EASY", "MEDIUM", "HARD"] },
    "SATURDAY":  { "allowedDifficulties": ["EASY", "MEDIUM", "HARD"] },
    "SUNDAY":    { "allowedDifficulties": ["EASY", "MEDIUM", "HARD"] }
  }
}
```

### PUT /settings
Обновить настройки.

**Body:** аналогично Response выше.  
**Response 200:** `Settings`

---

## Коды ошибок

| Код | Значение |
|-----|---------|
| 400 | Неверный формат запроса |
| 404 | Ресурс не найден |
| 409 | Конфликт (уникальность) |
| 422 | Бизнес-ошибка (нехватка блюд, несовместимость) |
| 500 | Внутренняя ошибка |

Все ошибки: `{ "error": "ERROR_CODE", "message": "..." }`
