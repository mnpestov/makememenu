import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { Unit, Difficulty, MealType } from '@make-me-menu/shared';
import prisma from '../../src/db/prismaClient';

describe('API Integration Flow', () => {
  let categoryId: number;
  let eggId: number;
  let milkId: number;
  let omeletId: number;
  let pancakesId: number;
  let menuId: number;
  let menuItemIdToReplace: number;
  let shoppingItemIdToUpdate: number;

  function getCurrentWeekStart(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  }
  const weekStart = getCurrentWeekStart().toISOString();

  beforeAll(async () => {
    // Delete any existing menu for this test week so generation succeeds
    await prisma.weeklyMenu.deleteMany({
      where: { weekStart: new Date(weekStart) }
    });
  });

  it('1. Create Category and Ingredients', async () => {
    let cat = await prisma.category.findFirst({ where: { name: 'Завтрак' } });
    if (!cat) {
      const catRes = await request(app).post('/api/categories').send({ name: 'Завтрак' });
      expect(catRes.status).toBe(201);
      categoryId = catRes.body.id;
    } else {
      categoryId = cat.id;
    }

    let egg = await prisma.ingredient.findFirst({ where: { name: 'Яйцо' } });
    if (!egg) {
      const eggRes = await request(app).post('/api/ingredients').send({ name: 'Яйцо' });
      expect(eggRes.status).toBe(201);
      eggId = eggRes.body.id;
    } else {
      eggId = egg.id;
    }

    let milk = await prisma.ingredient.findFirst({ where: { name: 'Молоко' } });
    if (!milk) {
      const milkRes = await request(app).post('/api/ingredients').send({ name: 'Молоко' });
      expect(milkRes.status).toBe(201);
      milkId = milkRes.body.id;
    } else {
      milkId = milk.id;
    }
  });

  it('2. Create Dishes', async () => {
    let omelet = await prisma.dish.findFirst({ where: { name: 'Омлет' } });
    if (!omelet) {
      const omeletRes = await request(app).post('/api/dishes').send({
        name: 'Омлет',
        categoryId,
        difficulty: Difficulty.EASY,
        servings: 2,
        forBreakfast: true,
        forLunch: true,
        ingredients: [
          { ingredientId: eggId, amount: 4, unit: Unit.PIECE },
          { ingredientId: milkId, amount: 100, unit: Unit.MILLILITER },
        ]
      });
      expect(omeletRes.status).toBe(201);
      omeletId = omeletRes.body.id;
    } else {
      omeletId = omelet.id;
    }

    let pancakes = await prisma.dish.findFirst({ where: { name: 'Блины' } });
    if (!pancakes) {
      const pancakesRes = await request(app).post('/api/dishes').send({
        name: 'Блины',
        categoryId,
        difficulty: Difficulty.EASY,
        servings: 4,
        forBreakfast: true,
        forLunch: true,
        ingredients: [
          { ingredientId: eggId, amount: 2, unit: Unit.PIECE },
          { ingredientId: milkId, amount: 0.5, unit: Unit.LITER },
        ]
      });
      expect(pancakesRes.status).toBe(201);
      pancakesId = pancakesRes.body.id;
    } else {
      pancakesId = pancakes.id;
    }
  });

  it('3. Generate Menu', async () => {
    const res = await request(app).post('/api/menus/generate').send({ weekStart });
    expect(res.status).toBe(201);
    expect(res.body.items.length).toBe(14); // 7 days * 2 meals
    
    menuId = res.body.id;
    
    // Find an omelet breakfast to replace later
    const omeletItem = res.body.items.find((i: any) => i.dish.id === omeletId);
    expect(omeletItem).toBeDefined();
    menuItemIdToReplace = omeletItem.id;
  });

  it('4. Prevent generating for the same week (409 Conflict)', async () => {
    const res = await request(app).post('/api/menus/generate').send({ weekStart });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CONFLICT');
  });

  it('5. Verify Shopping List Aggregation and Dates', async () => {
    const res = await request(app).get(`/api/menus/${menuId}/shopping`);
    expect(res.status).toBe(200);
    
    // Check milk aggregation (LITER converted to MILLILITER)
    const milkItem = res.body.find((i: any) => i.ingredient.id === milkId);
    expect(milkItem).toBeDefined();
    expect(milkItem.unit).toBe(Unit.MILLILITER);
    
    // Check dates are populated
    expect(milkItem.neededDates.length).toBeGreaterThan(0);
    
    shoppingItemIdToUpdate = milkItem.id;
  });

  it('6. Mark shopping item as purchased', async () => {
    const res = await request(app)
      .patch(`/api/menus/${menuId}/shopping/${shoppingItemIdToUpdate}`)
      .send({ isPurchased: true });
      
    expect(res.status).toBe(200);
    expect(res.body.isPurchased).toBe(true);
  });

  it('7. Replace Dish and verify Shopping List recalculation preserves isPurchased', async () => {
    // Replace omelet with pancakes
    const replaceRes = await request(app)
      .put(`/api/menus/${menuId}/items/${menuItemIdToReplace}`)
      .send({ dishId: pancakesId });
    expect(replaceRes.status).toBe(200);
    
    // Fetch shopping list again
    const shopRes = await request(app).get(`/api/menus/${menuId}/shopping`);
    const milkItem = shopRes.body.find((i: any) => i.ingredient.id === milkId);
    
    // Milk amounts should have changed because pancakes use different amounts than omelet
    // BUT isPurchased must remain true
    expect(milkItem.isPurchased).toBe(true);
  });
  
  it('8. Sync Cooking History', async () => {
    // We update one menu item's date to be in the past to simulate time passing
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    
    await prisma.menuItem.update({
        where: { id: menuItemIdToReplace },
        data: { date: pastDate }
    });
    
    // Fetch current menu (this triggers syncCookingHistory)
    const res = await request(app).get('/api/menus/current');
    expect(res.status).toBe(200);
    
    // Verify cooking history was created
    const historyCount = await prisma.cookingHistory.count();
    expect(historyCount).toBeGreaterThanOrEqual(1);
    
    // Verify dish cache is updated
    const dish = await prisma.dish.findUnique({ where: { id: pancakesId }});
    expect(dish?.lastCookedAt).not.toBeNull();
  });
});
