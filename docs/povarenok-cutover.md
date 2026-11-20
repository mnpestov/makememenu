# Переключение каталога рецептов

Первое переключение добавляет в «Хочу попробовать» 500 авторских рецептов из
`everyday-recipes-review.json`. Для «Поварёнка» предусмотрен импорт отдельного
проверенного файла. Происхождение каждой записи хранится в каталоге.

## Деплой через PM2

Сохраните резервную копию БД перед применением миграции и переключением.
На сервере из корня проекта выполните:

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm --filter @make-me-menu/backend exec prisma generate
pnpm build

cd apps/backend
pnpm exec prisma migrate deploy
node --env-file=.env dist/scripts/switchRecipeCatalog.js
```

Когда счётчики предпросмотра проверены, выполните из `apps/backend`:

```bash
node --env-file=.env dist/scripts/switchRecipeCatalog.js --apply
pm2 restart make-me-menu-backend --update-env
```

Команда использует `DATABASE_URL` из окружения или `apps/backend/.env`. Переключение
выполняется одной транзакцией. Блюда UniTools в постоянном меню сохраняются.
Неиспользованные записи со статусом `TRY`, без оценок, истории и изменений
после создания удаляются. Остальные скрываются из основного каталога и будущего
подбора. Ссылки из недельного меню, история и отметки о покупках сохраняются.
Повторный запуск пропускает существующие и удалённые семьёй записи.

## Файл для «Поварёнка»

Отберите блюда из [Parquet-выгрузки](https://huggingface.co/datasets/d0rj/povarenok_recipes_detail)
в отдельный JSON. Метаданные выгрузки указывают Apache-2.0, но [автор другой выгрузки
с того же сайта](https://huggingface.co/datasets/rogozinushka/povarenok-recipes/blob/main/README.md)
предупреждает о правах на оригинальные материалы. При подготовке файла проверьте
условия для оригинальных инструкций или приложите собственные инструкции и
ссылку на оригинал.

Файл — массив объектов в формате авторской подборки со следующими правилами.

- `id` — строка с числовым ID из `page_url`. `sourceUrl` — ссылка вида
  `https://www.povarenok.ru/recipes/show/<id>/`.
- `name`, `category`, `servings`, `ingredients` и `steps` обязательны. Для каждого
  ингредиента укажите `name`, `amount`, `unit`. Для «по вкусу» используйте
  `amount: null`. В `note` можно хранить уточнение из исходного состава.
- `nutritionPerServing` — объект `{calories, protein, fat, carbs}` или `null`.
  При отсутствии значений на порцию можно передать `nutritionPer100g` того же
  формата. `timeMinutes` — необязательное общее время готовки.
- Проверяйте весь обязательный состав. Подходят распространённые сыры, рыба,
  соусы, сухие специи, консервы и заморозка. Для первой партии исключите блюда,
  которым нужны специализированные продукты вроде юдзу или листьев кафрского
  лайма. Сверьте близкие рецепты с уже существующими блюдами.
- Категории «завтрак», «суп» и «основное» участвуют в подборе на подходящий
  приём пищи. Для гарниров, салатов, закусок, выпечки, десертов и напитков
  можно назначить приём пищи в редакторе.

Из `apps/backend` проверьте число новых записей, затем примените импорт:

```bash
node --env-file=.env dist/scripts/switchRecipeCatalog.js --povarenok /путь/к/проверенным-рецептам.json
node --env-file=.env dist/scripts/switchRecipeCatalog.js --povarenok /путь/к/проверенным-рецептам.json --apply
```

## Инвентаризация UniTools

Запрос для первичной инвентаризации. Счётчики пересекаются: одно блюдо может быть и в меню, и с оценкой.

```sql
SELECT
  count(*) AS unitools_total,
  count(*) FILTER (WHERE d.status = 'FAVORITE') AS in_rotation,
  count(*) FILTER (WHERE d.rating IS NOT NULL OR d."reviewComment" IS NOT NULL) AS reviewed,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM "MenuItem" m WHERE m."dishId" = d.id
  )) AS in_menus,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM "CookingHistory" h WHERE h."dishId" = d.id
  )) AS in_cooking_history
FROM "Dish" d
WHERE d.source = 'UNITOOLS';
```
