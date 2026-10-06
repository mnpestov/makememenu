/**
 * Database seed script.
 * Run with: pnpm --filter backend db:seed
 *
 * Creates:
 *  - 10 categories
 *  - 36 ingredients
 *  - 15 dishes (5 breakfast + 10 lunch, covering all constraints)
 *  - Initial app settings
 *
 * Idempotent: clears all tables before seeding (safe for dev only).
 */

import { PrismaClient, Difficulty, Unit, Cook } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Default day settings: all difficulties allowed Mon/Tue/Fri/Sat/Sun; Wed/Thu: EASY/MEDIUM only */
const DEFAULT_DAY_SETTINGS = {
  MONDAY:    { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: ['YULIA', 'MISHA'] },
  TUESDAY:   { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: ['YULIA', 'MISHA'] },
  WEDNESDAY: { allowedDifficulties: ['EASY', 'MEDIUM'],          availableCooks: ['YULIA', 'MISHA'] },
  THURSDAY:  { allowedDifficulties: ['EASY', 'MEDIUM'],          availableCooks: ['YULIA', 'MISHA'] },
  FRIDAY:    { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: ['YULIA', 'MISHA'] },
  SATURDAY:  { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: ['YULIA', 'MISHA'] },
  SUNDAY:    { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: ['YULIA', 'MISHA'] },
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Завтрак',
  'Суп',
  'Мясо',
  'Птица',
  'Рыба',
  'Паста',
  'Гарнир',
  'Салат',
  'Выпечка',
  'Другое',
];

const INGREDIENTS = [
  'Яйцо',
  'Молоко',
  'Масло сливочное',
  'Масло растительное',
  'Соль',
  'Перец чёрный',
  'Мука пшеничная',
  'Сахар',
  'Куриное филе',
  'Говядина',
  'Свинина',
  'Баранина',
  'Лосось',
  'Треска',
  'Рис',
  'Спагетти',
  'Лук репчатый',
  'Морковь',
  'Картофель',
  'Томат свежий',
  'Чеснок',
  'Сыр твёрдый',
  'Сметана',
  'Творог',
  'Белокочанная капуста',
  'Зелень',
  'Сливки 20%',
  'Панировочные сухари',
  'Томатная паста',
  'Перец болгарский',
  'Свёкла',
  'Бекон',
  'Пармезан',
  'Хлеб белый',
  'Гречневая крупа',
  'Вермишель',
];

interface DishIngredientSeed {
  ingredient: string;
  amount: number;
  unit: Unit;
}

interface DishSeed {
  name: string;
  category: string;
  difficulty: Difficulty;
  cook?: Cook;
  servings: number;
  forBreakfast: boolean;
  forLunch: boolean;
  recipe?: string;
  ingredients: DishIngredientSeed[];
}

const DISHES: DishSeed[] = [
  // ─── Breakfast dishes ───────────────────────────────────────────────────────

  {
    name: 'Омлет',
    category: 'Завтрак',
    difficulty: Difficulty.EASY,
    servings: 3,
    forBreakfast: true,
    forLunch: false,
    recipe: '1. Взбить яйца с молоком и солью.\n2. Вылить на сковороду с растопленным маслом.\n3. Накрыть крышкой и готовить 5–7 минут на среднем огне.',
    ingredients: [
      { ingredient: 'Яйцо', amount: 6, unit: Unit.PIECE },
      { ingredient: 'Молоко', amount: 100, unit: Unit.MILLILITER },
      { ingredient: 'Масло сливочное', amount: 20, unit: Unit.GRAM },
      { ingredient: 'Соль', amount: 5, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Сырники',
    category: 'Завтрак',
    difficulty: Difficulty.MEDIUM,
    cook: Cook.YULIA,
    servings: 3,
    forBreakfast: true,
    forLunch: false,
    recipe: '1. Смешать творог, яйца, сахар, муку и соль.\n2. Сформировать сырники.\n3. Обжарить на масле по 3–4 минуты с каждой стороны до золотистой корочки.',
    ingredients: [
      { ingredient: 'Творог', amount: 500, unit: Unit.GRAM },
      { ingredient: 'Яйцо', amount: 2, unit: Unit.PIECE },
      { ingredient: 'Мука пшеничная', amount: 60, unit: Unit.GRAM },
      { ingredient: 'Сахар', amount: 30, unit: Unit.GRAM },
      { ingredient: 'Масло растительное', amount: 30, unit: Unit.MILLILITER },
      { ingredient: 'Соль', amount: 3, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Яичница с беконом',
    category: 'Завтрак',
    difficulty: Difficulty.EASY,
    cook: Cook.MISHA,
    servings: 3,
    forBreakfast: true,
    forLunch: false,
    recipe: '1. Обжарить бекон на сухой сковороде до хруста.\n2. Вбить яйца к бекону.\n3. Готовить до желаемой готовности желтка.',
    ingredients: [
      { ingredient: 'Яйцо', amount: 6, unit: Unit.PIECE },
      { ingredient: 'Бекон', amount: 150, unit: Unit.GRAM },
      { ingredient: 'Масло растительное', amount: 10, unit: Unit.MILLILITER },
      { ingredient: 'Соль', amount: 3, unit: Unit.GRAM },
      { ingredient: 'Перец чёрный', amount: 2, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Блины',
    category: 'Завтрак',
    difficulty: Difficulty.MEDIUM,
    servings: 4,
    forBreakfast: true,
    forLunch: false,
    recipe: '1. Смешать муку, яйца, молоко, сахар, соль.\n2. Добавить масло, перемешать до однородности.\n3. Жарить на разогретой сковороде по 1–2 минуты с каждой стороны.',
    ingredients: [
      { ingredient: 'Мука пшеничная', amount: 300, unit: Unit.GRAM },
      { ingredient: 'Молоко', amount: 600, unit: Unit.MILLILITER },
      { ingredient: 'Яйцо', amount: 3, unit: Unit.PIECE },
      { ingredient: 'Сахар', amount: 30, unit: Unit.GRAM },
      { ingredient: 'Масло растительное', amount: 30, unit: Unit.MILLILITER },
      { ingredient: 'Соль', amount: 5, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Гренки с яйцом',
    category: 'Завтрак',
    difficulty: Difficulty.EASY,
    servings: 3,
    forBreakfast: true,
    forLunch: false,
    recipe: '1. Взбить яйца с молоком и солью.\n2. Окунуть ломтики хлеба в яичную смесь.\n3. Обжарить на сливочном масле по 2–3 минуты с каждой стороны.',
    ingredients: [
      { ingredient: 'Хлеб белый', amount: 300, unit: Unit.GRAM },
      { ingredient: 'Яйцо', amount: 3, unit: Unit.PIECE },
      { ingredient: 'Молоко', amount: 100, unit: Unit.MILLILITER },
      { ingredient: 'Масло сливочное', amount: 30, unit: Unit.GRAM },
      { ingredient: 'Соль', amount: 3, unit: Unit.GRAM },
    ],
  },

  // ─── Lunch dishes ───────────────────────────────────────────────────────────

  {
    name: 'Борщ',
    category: 'Суп',
    difficulty: Difficulty.MEDIUM,
    servings: 4,
    forBreakfast: false,
    forLunch: true,
    recipe: '1. Сварить говядину до готовности (1–1,5 ч), вынуть.\n2. Обжарить лук, морковь, свёклу с томатной пастой.\n3. Добавить в бульон картофель, капусту, зажарку.\n4. Варить 20 мин. Нарезать мясо, вернуть в суп.',
    ingredients: [
      { ingredient: 'Говядина', amount: 500, unit: Unit.GRAM },
      { ingredient: 'Свёкла', amount: 300, unit: Unit.GRAM },
      { ingredient: 'Белокочанная капуста', amount: 300, unit: Unit.GRAM },
      { ingredient: 'Картофель', amount: 300, unit: Unit.GRAM },
      { ingredient: 'Морковь', amount: 150, unit: Unit.GRAM },
      { ingredient: 'Лук репчатый', amount: 100, unit: Unit.GRAM },
      { ingredient: 'Томатная паста', amount: 50, unit: Unit.GRAM },
      { ingredient: 'Масло растительное', amount: 30, unit: Unit.MILLILITER },
      { ingredient: 'Соль', amount: 10, unit: Unit.GRAM },
      { ingredient: 'Перец чёрный', amount: 3, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Паста карбонара',
    category: 'Паста',
    difficulty: Difficulty.MEDIUM,
    cook: Cook.YULIA,
    servings: 3,
    forBreakfast: false,
    forLunch: true,
    recipe: '1. Отварить спагетти al dente.\n2. Обжарить бекон до хруста.\n3. Взбить яйца с пармезаном и перцем.\n4. Смешать горячие спагетти с беконом, снять с огня.\n5. Добавить яичную смесь, быстро перемешать.',
    ingredients: [
      { ingredient: 'Спагетти', amount: 300, unit: Unit.GRAM },
      { ingredient: 'Бекон', amount: 200, unit: Unit.GRAM },
      { ingredient: 'Яйцо', amount: 4, unit: Unit.PIECE },
      { ingredient: 'Пармезан', amount: 80, unit: Unit.GRAM },
      { ingredient: 'Сливки 20%', amount: 100, unit: Unit.MILLILITER },
      { ingredient: 'Перец чёрный', amount: 5, unit: Unit.GRAM },
      { ingredient: 'Соль', amount: 10, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Плов с бараниной',
    category: 'Другое',
    difficulty: Difficulty.HARD,
    cook: Cook.MISHA,
    servings: 4,
    forBreakfast: false,
    forLunch: true,
    recipe: '1. Разогреть масло в казане, обжарить лук до золотистого.\n2. Добавить баранину, обжарить 10 мин.\n3. Добавить морковь, жарить ещё 10 мин.\n4. Залить водой (2:1 к рису), добавить чеснок, специи.\n5. Засыпать рис, накрыть, тушить 25–30 мин.',
    ingredients: [
      { ingredient: 'Рис', amount: 400, unit: Unit.GRAM },
      { ingredient: 'Баранина', amount: 600, unit: Unit.GRAM },
      { ingredient: 'Морковь', amount: 300, unit: Unit.GRAM },
      { ingredient: 'Лук репчатый', amount: 150, unit: Unit.GRAM },
      { ingredient: 'Масло растительное', amount: 80, unit: Unit.MILLILITER },
      { ingredient: 'Чеснок', amount: 20, unit: Unit.GRAM },
      { ingredient: 'Соль', amount: 10, unit: Unit.GRAM },
      { ingredient: 'Перец чёрный', amount: 3, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Запечённый лосось',
    category: 'Рыба',
    difficulty: Difficulty.EASY,
    servings: 3,
    forBreakfast: false,
    forLunch: true,
    recipe: '1. Лосось промыть, обсушить.\n2. Смазать маслом, посолить, поперчить.\n3. Запекать при 180°C 20–25 минут.',
    ingredients: [
      { ingredient: 'Лосось', amount: 600, unit: Unit.GRAM },
      { ingredient: 'Масло растительное', amount: 30, unit: Unit.MILLILITER },
      { ingredient: 'Соль', amount: 8, unit: Unit.GRAM },
      { ingredient: 'Перец чёрный', amount: 3, unit: Unit.GRAM },
      { ingredient: 'Зелень', amount: 20, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Котлеты домашние',
    category: 'Мясо',
    difficulty: Difficulty.MEDIUM,
    servings: 4,
    forBreakfast: false,
    forLunch: true,
    recipe: '1. Пропустить мясо через мясорубку с луком.\n2. Добавить яйцо, замоченный в молоке хлеб (панировочные сухари), соль, перец.\n3. Сформировать котлеты, обвалять в панировке.\n4. Жарить на масле по 5–6 мин с каждой стороны.',
    ingredients: [
      { ingredient: 'Свинина', amount: 400, unit: Unit.GRAM },
      { ingredient: 'Говядина', amount: 200, unit: Unit.GRAM },
      { ingredient: 'Лук репчатый', amount: 100, unit: Unit.GRAM },
      { ingredient: 'Яйцо', amount: 2, unit: Unit.PIECE },
      { ingredient: 'Панировочные сухари', amount: 80, unit: Unit.GRAM },
      { ingredient: 'Молоко', amount: 100, unit: Unit.MILLILITER },
      { ingredient: 'Масло растительное', amount: 50, unit: Unit.MILLILITER },
      { ingredient: 'Соль', amount: 8, unit: Unit.GRAM },
      { ingredient: 'Перец чёрный', amount: 3, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Курица запечённая с чесноком',
    category: 'Птица',
    difficulty: Difficulty.EASY,
    servings: 4,
    forBreakfast: false,
    forLunch: true,
    recipe: '1. Куриное филе нарезать крупными кусками.\n2. Смешать масло, чеснок, соль, перец.\n3. Замариновать филе на 30 мин.\n4. Запекать при 200°C 25–30 минут.',
    ingredients: [
      { ingredient: 'Куриное филе', amount: 800, unit: Unit.GRAM },
      { ingredient: 'Чеснок', amount: 20, unit: Unit.GRAM },
      { ingredient: 'Масло растительное', amount: 40, unit: Unit.MILLILITER },
      { ingredient: 'Соль', amount: 8, unit: Unit.GRAM },
      { ingredient: 'Перец чёрный', amount: 3, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Гречка с говядиной',
    category: 'Мясо',
    difficulty: Difficulty.MEDIUM,
    servings: 3,
    forBreakfast: false,
    forLunch: true,
    recipe: '1. Говядину нарезать кубиками, обжарить до румяной корочки.\n2. Добавить лук и морковь, обжарить 5 мин.\n3. Залить водой (2 стакана), тушить 30 мин.\n4. Добавить промытую гречку, соль, варить 20 мин под крышкой.',
    ingredients: [
      { ingredient: 'Говядина', amount: 400, unit: Unit.GRAM },
      { ingredient: 'Гречневая крупа', amount: 300, unit: Unit.GRAM },
      { ingredient: 'Лук репчатый', amount: 100, unit: Unit.GRAM },
      { ingredient: 'Морковь', amount: 100, unit: Unit.GRAM },
      { ingredient: 'Масло растительное', amount: 30, unit: Unit.MILLILITER },
      { ingredient: 'Соль', amount: 8, unit: Unit.GRAM },
      { ingredient: 'Перец чёрный', amount: 3, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Куриный суп с вермишелью',
    category: 'Суп',
    difficulty: Difficulty.EASY,
    servings: 4,
    forBreakfast: false,
    forLunch: true,
    recipe: '1. Сварить куриное филе (30–40 мин), вынуть, нарезать.\n2. В бульон добавить картофель, варить 15 мин.\n3. Добавить пассерованные лук и морковь.\n4. Добавить вермишель, варить 5–7 мин.\n5. Вернуть курицу, посолить.',
    ingredients: [
      { ingredient: 'Куриное филе', amount: 400, unit: Unit.GRAM },
      { ingredient: 'Картофель', amount: 300, unit: Unit.GRAM },
      { ingredient: 'Морковь', amount: 100, unit: Unit.GRAM },
      { ingredient: 'Лук репчатый', amount: 80, unit: Unit.GRAM },
      { ingredient: 'Вермишель', amount: 80, unit: Unit.GRAM },
      { ingredient: 'Масло растительное', amount: 20, unit: Unit.MILLILITER },
      { ingredient: 'Соль', amount: 10, unit: Unit.GRAM },
      { ingredient: 'Перец чёрный', amount: 3, unit: Unit.GRAM },
      { ingredient: 'Зелень', amount: 15, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Тефтели в томатном соусе',
    category: 'Мясо',
    difficulty: Difficulty.MEDIUM,
    servings: 4,
    forBreakfast: false,
    forLunch: true,
    recipe: '1. Смешать фарш со свининой и говядиной, рисом, луком, яйцом, солью.\n2. Сформировать тефтели, обжарить до корочки.\n3. Смешать томатную пасту со сметаной и водой.\n4. Залить тефтели соусом, тушить 25–30 мин.',
    ingredients: [
      { ingredient: 'Свинина', amount: 300, unit: Unit.GRAM },
      { ingredient: 'Говядина', amount: 200, unit: Unit.GRAM },
      { ingredient: 'Рис', amount: 80, unit: Unit.GRAM },
      { ingredient: 'Лук репчатый', amount: 100, unit: Unit.GRAM },
      { ingredient: 'Яйцо', amount: 1, unit: Unit.PIECE },
      { ingredient: 'Томатная паста', amount: 60, unit: Unit.GRAM },
      { ingredient: 'Сметана', amount: 100, unit: Unit.GRAM },
      { ingredient: 'Масло растительное', amount: 30, unit: Unit.MILLILITER },
      { ingredient: 'Соль', amount: 8, unit: Unit.GRAM },
      { ingredient: 'Перец чёрный', amount: 3, unit: Unit.GRAM },
    ],
  },
  {
    name: 'Рыбные котлеты',
    category: 'Рыба',
    difficulty: Difficulty.MEDIUM,
    servings: 3,
    forBreakfast: false,
    forLunch: true,
    recipe: '1. Треску перемолоть с луком.\n2. Добавить яйцо, размоченные в молоке панировочные сухари, соль, перец.\n3. Сформировать котлеты, обвалять в панировке.\n4. Жарить на масле по 4–5 мин с каждой стороны.',
    ingredients: [
      { ingredient: 'Треска', amount: 600, unit: Unit.GRAM },
      { ingredient: 'Лук репчатый', amount: 100, unit: Unit.GRAM },
      { ingredient: 'Яйцо', amount: 1, unit: Unit.PIECE },
      { ingredient: 'Панировочные сухари', amount: 60, unit: Unit.GRAM },
      { ingredient: 'Молоко', amount: 80, unit: Unit.MILLILITER },
      { ingredient: 'Масло растительное', amount: 40, unit: Unit.MILLILITER },
      { ingredient: 'Соль', amount: 8, unit: Unit.GRAM },
      { ingredient: 'Перец чёрный', amount: 2, unit: Unit.GRAM },
    ],
  },
];

// ─── Main Seed ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱 Starting seed...');

  // Clear in reverse dependency order
  console.log('  Clearing existing data...');
  await prisma.cookingHistory.deleteMany();
  await prisma.shoppingItemDate.deleteMany();
  await prisma.shoppingItem.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.weeklyMenu.deleteMany();
  await prisma.dishIngredient.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.category.deleteMany();
  await prisma.settings.deleteMany();

  // ─── Categories ─────────────────────────────────────────────────────────────
  console.log('  Creating categories...');
  await prisma.category.createMany({
    data: CATEGORIES.map((name) => ({ name })),
  });

  const categories = await prisma.category.findMany();
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

  // ─── Ingredients ────────────────────────────────────────────────────────────
  console.log('  Creating ingredients...');
  await prisma.ingredient.createMany({
    data: INGREDIENTS.map((name) => ({ name })),
  });

  const ingredients = await prisma.ingredient.findMany();
  const ingredientMap = new Map(ingredients.map((i) => [i.name, i.id]));

  // ─── Dishes ─────────────────────────────────────────────────────────────────
  console.log('  Creating dishes...');
  for (const dishData of DISHES) {
    const categoryId = categoryMap.get(dishData.category);
    if (categoryId === undefined) {
      throw new Error(`Category not found: ${dishData.category}`);
    }

    await prisma.dish.create({
      data: {
        name: dishData.name,
        categoryId,
        difficulty: dishData.difficulty,
        cook: dishData.cook ?? Cook.BOTH,
        servings: dishData.servings,
        forBreakfast: dishData.forBreakfast,
        forLunch: dishData.forLunch,
        recipe: dishData.recipe ?? null,
        ingredients: {
          create: dishData.ingredients.map((ing) => {
            const ingredientId = ingredientMap.get(ing.ingredient);
            if (ingredientId === undefined) {
              throw new Error(`Ingredient not found: ${ing.ingredient}`);
            }
            return {
              ingredientId,
              amount: ing.amount,
              unit: ing.unit,
            };
          }),
        },
      },
    });
  }

  // ─── Settings ───────────────────────────────────────────────────────────────
  console.log('  Creating settings...');
  await prisma.settings.create({
    data: {
      familySize: 3,
      mealsPerDay: 2,
      daySettings: DEFAULT_DAY_SETTINGS,
    },
  });

  // ─── Summary ─────────────────────────────────────────────────────────────────
  const stats = {
    categories: await prisma.category.count(),
    ingredients: await prisma.ingredient.count(),
    dishes: await prisma.dish.count(),
    breakfastDishes: await prisma.dish.count({ where: { forBreakfast: true } }),
    lunchDishes: await prisma.dish.count({ where: { forLunch: true } }),
  };

  console.log('\n✅ Seed complete!');
  console.log(`   Categories:  ${stats.categories}`);
  console.log(`   Ingredients: ${stats.ingredients}`);
  console.log(`   Dishes:      ${stats.dishes} (${stats.breakfastDishes} breakfast, ${stats.lunchDishes} lunch)`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
