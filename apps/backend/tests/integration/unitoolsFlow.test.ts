import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from '../../src/db/prismaClient';
import app from '../../src/app';
import { importUnitools } from '../fixtures/unitools/importUnitools';
import { switchRecipeCatalog } from '../../src/services/catalogCutover';
import { dishService } from '../../src/services/dishService';
import { menuService } from '../../src/services/menuService';
import { shoppingService } from '../../src/services/shoppingService';

// Keep this guard in the test as well as the runner/config: importing it directly must be safe.
if (!process.env['DATABASE_URL'] || !new URL(process.env['DATABASE_URL']).pathname.endsWith('_unitools_test')) {
  throw new Error('Refusing to run against a family database');
}

describe.sequential('UniTools family workflow (isolated PostgreSQL)', () => {
  let manualId: number;
  let menuId: number;
  let lunchId: number;
  let carbonaraId: number;
  const token = jwt.sign({ userId: 1, username: 'test' }, process.env['JWT_SECRET']!);

  beforeAll(async () => {
    await prisma.weeklyMenu.deleteMany();
    await prisma.cookingHistory.deleteMany();
    await prisma.dish.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.category.deleteMany();
    await prisma.settings.deleteMany();
    await prisma.recipeImportExclusion.deleteMany();
    await prisma.user.upsert({ where: { username: 'unitools-preview' }, update: {}, create: {
      username: 'unitools-preview', password: await bcrypt.hash('unitools-test-password', 10),
    } });
    await prisma.ingredient.create({ data: { name: 'Спагетти' } });
    const manual = await prisma.dish.create({ data: {
      name: 'Семейный рецепт', difficulty: 'EASY', servings: 3,
      forBreakfast: true, forLunch: true, calories: 100,
    } });
    manualId = manual.id;
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('imports all recipes while keeping existing dishes and their per-100g basis', async () => {
    expect(await importUnitools()).toMatchObject({ imported: 501, skipped: 0 });
    expect(await prisma.dish.count()).toBe(502);
    expect(await prisma.dish.count({ where: { status: 'TRY', nutritionBasis: 'PER_SERVING' } })).toBe(501);
    expect(await prisma.ingredient.count({ where: { name: 'Спагетти' } })).toBe(1);
    expect(await prisma.dish.findUnique({ where: { id: manualId } })).toMatchObject({ calories: 100, nutritionBasis: 'PER_100G', status: 'FAVORITE' });
    carbonaraId = (await prisma.dish.findUniqueOrThrow({ where: { source_sourceId: { source: 'UNITOOLS', sourceId: 'spaghetti-carbonara' } } })).id;
  });

  it('serializes concurrent reimports without duplicate dishes or ingredients', async () => {
    const ingredientCount = await prisma.ingredient.count();
    const results = await Promise.all([importUnitools(), importUnitools()]);
    expect(results.every(result => result.imported === 0 && result.skipped === 501)).toBe(true);
    expect(await prisma.ingredient.count()).toBe(ingredientCount);
    expect(await prisma.dish.count()).toBe(502);
  });

  it('generates only from permanent dishes and never marks a viewed menu as cooked', async () => {
    const menu = await menuService.generate({ weekStart: '2036-11-17T00:00:00.000Z' });
    menuId = menu.id;
    lunchId = menu.items.find(i => i.mealType === 'LUNCH')!.id;
    expect(menu.items).toHaveLength(14);
    expect(menu.items.every(i => i.dish.id === manualId)).toBe(true);
    await menuService.getById(menuId);
    expect(await prisma.cookingHistory.count()).toBe(0);
  });

  it('offers trial recipes, validates meal types and builds shopping with to-taste quantities', async () => {
    const candidates = await menuService.getReplacementCandidates(menuId, lunchId);
    expect(candidates.some(d => d.id === carbonaraId && d.status === 'TRY')).toBe(true);
    const breakfastId = (await menuService.getById(menuId)).items.find(i => i.mealType === 'BREAKFAST')!.id;
    await expect(menuService.replaceItem(menuId, breakfastId, { dishId: carbonaraId })).rejects.toThrow('приёма пищи');
    await menuService.replaceItem(menuId, lunchId, { dishId: carbonaraId });
    const shopping = await shoppingService.getShoppingList(menuId);
    expect(shopping.some(i => i.unit === 'TO_TASTE' && i.totalAmount === null)).toBe(true);
    expect(shopping.find(i => i.ingredient.name === 'Спагетти')).toMatchObject({ totalAmount: 600, unit: 'GRAM' });
  });

  it('records confirmed cooking and a review, and retains family edits on import', async () => {
    const reviewed = await dishService.review(carbonaraId, { rating: 5, status: 'FAVORITE', comment: 'Меньше соли' });
    expect(reviewed).toMatchObject({ rating: 5, status: 'FAVORITE', reviewComment: 'Меньше соли', nutritionBasis: 'PER_SERVING' });
    expect(await prisma.cookingHistory.count()).toBe(1);
    await menuService.getById(menuId);
    expect(await prisma.cookingHistory.count()).toBe(1);
    await prisma.dish.update({ where: { id: carbonaraId }, data: { name: 'Наша карбонара' } });
    await importUnitools();
    expect(await dishService.getById(carbonaraId)).toMatchObject({ name: 'Наша карбонара', rating: 5, reviewComment: 'Меньше соли' });
  });

  it('rejects a recipe without losing an existing menu', async () => {
    await dishService.review(carbonaraId, { rating: 3, status: 'REJECTED', comment: 'Слишком долго' });
    expect((await menuService.getReplacementCandidates(menuId, lunchId)).some(d => d.id === carbonaraId)).toBe(false);
    await expect(menuService.replaceItem(menuId, lunchId, { dishId: carbonaraId })).rejects.toThrow('Отклонённое');
    await expect(dishService.delete(carbonaraId)).rejects.toThrow('используется в меню');
    expect((await menuService.getById(menuId)).items.some(i => i.dish.id === carbonaraId)).toBe(true);
    expect(await prisma.recipeImportExclusion.count()).toBe(0); // FK failure rolled back the tombstone too.
    await importUnitools();
    expect((await dishService.getById(carbonaraId)).status).toBe('REJECTED');
  });

  it('does not resurrect a deliberately deleted recipe on reimport', async () => {
    const dish = await prisma.dish.findFirstOrThrow({ where: { source: 'UNITOOLS', status: 'TRY' } });
    await dishService.delete(dish.id);
    expect(await prisma.recipeImportExclusion.count()).toBe(1);
    expect((await importUnitools()).imported).toBe(0);
    expect(await prisma.dish.findUnique({ where: { id: dish.id } })).toBeNull();
  });

  it('removes the old import endpoint and validates review input', async () => {
    const login = await request(app).post('/api/auth/login').send({ username: 'unitools-preview', password: 'unitools-test-password' });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTypeOf('string');
    expect((await request(app).post('/api/dishes/import/unitools')).status).toBe(401);
    expect((await request(app).post(`/api/dishes/${manualId}/review`)
      .set('Authorization', `Bearer ${token}`).send({ rating: 8, status: 'FAVORITE' })).status).toBe(400);
    expect((await request(app).get('/api/dishes/not-an-id').set('Authorization', `Bearer ${token}`)).status).toBe(400);
    const imported = await request(app).post('/api/dishes/import/unitools').set('Authorization', `Bearer ${token}`);
    expect(imported.status).toBe(404);
    const response = await request(app).post(`/api/dishes/${manualId}/review`)
      .set('Authorization', `Bearer ${token}`).send({ rating: 4, status: 'FAVORITE', comment: 'Оставляем' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ rating: 4, status: 'FAVORITE', reviewComment: 'Оставляем' });
  });

  it('previews and atomically switches the catalog, preserving history and family choices', async () => {
    const untouched = await prisma.dish.create({
      data: {
        name: 'Старый нетронутый рецепт', servings: 4, status: 'TRY', difficulty: 'EASY',
        source: 'UNITOOLS', sourceId: 'cutover-untouched',
        createdAt: new Date('2026-11-01'), updatedAt: new Date('2026-11-01'),
      },
    });
    const favorite = await prisma.dish.create({
      data: { name: 'Семейный фаворит из UniTools', servings: 4, status: 'FAVORITE',
        difficulty: 'EASY', source: 'UNITOOLS', sourceId: 'cutover-favorite' },
    });
    const edited = await prisma.dish.create({
      data: { name: 'Семейная правка', servings: 4, status: 'TRY',
        difficulty: 'EASY', source: 'UNITOOLS', sourceId: 'cutover-edited',
        createdAt: new Date('2026-11-01'), updatedAt: new Date('2026-11-02') },
    });
    const povarenok = [{
      id: '987654321', name: 'Тестовая карточка', category: 'суп', servings: 3,
      ingredients: [{ name: 'Картофель', amount: 400, unit: 'г' }],
      steps: ['Тестовый шаг'], nutritionPerServing: null,
      nutritionPer100g: { calories: 80, protein: 2, fat: 1, carbs: 16 },
      sourceUrl: 'https://www.povarenok.ru/recipes/show/987654321/',
    }];
    const shoppingBefore = await shoppingService.getShoppingList(menuId);
    const historyBefore = await prisma.cookingHistory.count();
    const preview = await switchRecipeCatalog({ apply: false, povarenok });
    expect(preview).toMatchObject({
      mode: 'dry-run', home: { add: 500 }, povarenok: { add: 1 },
      unitools: { remove: expect.any(Number), archive: expect.any(Number), favoritesKept: 1 },
    });
    expect(preview.unitools.remove).toBeGreaterThan(0);
    expect(await prisma.dish.count({ where: { source: 'HOME' } })).toBe(0);
    await expect(switchRecipeCatalog({ apply: true, povarenok: [{ ...povarenok[0], sourceUrl: 'https://example.org/' }] })).rejects.toThrow('ссылка');
    expect(await prisma.dish.count({ where: { source: 'HOME' } })).toBe(0);

    expect(await switchRecipeCatalog({ apply: true, povarenok })).toEqual({ ...preview, mode: 'apply' });
    expect(await prisma.dish.count({ where: { source: 'HOME', status: 'TRY' } })).toBe(500);
    expect(await prisma.dish.findUnique({ where: { id: untouched.id } })).toBeNull();
    expect((await dishService.getAll()).some(d => d.id === favorite.id)).toBe(true);
    expect((await dishService.getAll()).some(d => d.id === edited.id || d.id === carbonaraId)).toBe(false);
    expect(await dishService.getById(carbonaraId)).toMatchObject({ archivedAt: expect.any(String), rating: 3 });
    expect(await prisma.cookingHistory.count()).toBe(historyBefore);
    expect((await menuService.getById(menuId)).items.some(i => i.dish.id === carbonaraId)).toBe(true);
    expect(await shoppingService.getShoppingList(menuId)).toEqual(shoppingBefore);
    await expect(menuService.replaceItem(menuId, lunchId, { dishId: carbonaraId })).rejects.toThrow('Архивное');
    const imported = await prisma.dish.findFirstOrThrow({ where: { source: 'POVARENOK' } });
    expect(imported).toMatchObject({ nutritionBasis: 'PER_100G', calories: 80, forLunch: true });
    const newDish = await prisma.dish.findFirstOrThrow({ where: { source: 'HOME', forLunch: true } });
    expect((await menuService.getReplacementCandidates(menuId, lunchId)).some(d => d.id === newDish.id)).toBe(true);

    await dishService.delete(newDish.id);
    expect(await switchRecipeCatalog({ apply: true, povarenok })).toMatchObject({
      home: { add: 0, skip: 500 }, povarenok: { add: 0, skip: 1 },
      unitools: { remove: 0, archive: 0, favoritesKept: 1 },
    });
  });
});
