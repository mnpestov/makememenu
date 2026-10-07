import prisma from '../db/prismaClient';
import { ShoppingItem, UpdateShoppingItemDto } from '@make-me-menu/shared';
import { NotFoundError } from '../utils/errors';
import { buildShoppingList } from '../domain/shoppingListBuilder';
import { settingsService } from './settingsService';

export class ShoppingService {
  /**
   * Recalculates the entire shopping list for a menu.
   * Drops existing items, remembers their isPurchased state, calculates new items using Domain logic,
   * and inserts them back.
   */
  async recalculateShoppingList(menuId: number): Promise<void> {
    // 1. Fetch all menu items with dishes and their ingredients
    const menuItems = await prisma.menuItem.findMany({
      where: { menuId },
      include: {
        dish: {
          include: {
            category: true,
            ingredients: {
              include: { ingredient: true }
            }
          }
        }
      }
    });

    // We map DB models to domain DTOs expected by buildShoppingList
    const mappedMenuItems = menuItems.map(item => ({
      id: item.id,
      menuId: item.menuId,
      mealType: item.mealType,
      date: item.date.toISOString(),
      dish: {
        id: item.dish.id,
        name: item.dish.name,
        category: item.dish.category ? {
          id: item.dish.category.id,
          name: item.dish.category.name,
          createdAt: item.dish.category.createdAt.toISOString(),
        } : null,
        difficulty: item.dish.difficulty,
        cook: item.dish.cook,
        servings: item.dish.servings,
        forBreakfast: item.dish.forBreakfast,
        forLunch: item.dish.forLunch,
        lastCookedAt: item.dish.lastCookedAt?.toISOString() ?? null,
        createdAt: item.dish.createdAt.toISOString(),
        updatedAt: item.dish.updatedAt.toISOString(),
        ingredients: item.dish.ingredients.map(di => ({
          ingredient: {
            id: di.ingredient.id,
            name: di.ingredient.name,
            createdAt: di.ingredient.createdAt.toISOString(),
          },
          amount: di.amount,
          unit: di.unit,
        }))
      }
    }));

    // 2. Fetch settings to get targetServings
    const settings = await settingsService.get();

    // 3. Domain Logic
    const drafts = buildShoppingList(mappedMenuItems, settings.targetServings);

    // 4. Fetch existing shopping items to preserve `isPurchased` state
    const existingItems = await prisma.shoppingItem.findMany({
      where: { menuId }
    });
    
    // Key format: `${ingredientId}_${baseUnit}`
    const isPurchasedMap = new Map<string, boolean>();
    for (const item of existingItems) {
      isPurchasedMap.set(`${item.ingredientId}_${item.unit}`, item.isPurchased);
    }

    // 5. Transaction: delete old, insert new
    await prisma.$transaction(async (tx) => {
      // Cascade will delete ShoppingItemDates automatically
      await tx.shoppingItem.deleteMany({
        where: { menuId }
      });

      for (const draft of drafts) {
        const key = `${draft.ingredient.id}_${draft.unit}`;
        const isPurchased = isPurchasedMap.get(key) ?? false;

        await tx.shoppingItem.create({
          data: {
            menuId,
            ingredientId: draft.ingredient.id,
            totalAmount: draft.totalAmount,
            unit: draft.unit,
            isPurchased,
            neededDates: {
              create: draft.neededDates.map(d => ({
                neededAt: new Date(d)
              }))
            }
          }
        });
      }
    });
  }

  async getShoppingList(menuId: number): Promise<ShoppingItem[]> {
    const items = await prisma.shoppingItem.findMany({
      where: { menuId },
      include: {
        ingredient: true,
        neededDates: true
      },
      orderBy: [
        { ingredient: { name: 'asc' } },
        { unit: 'asc' }
      ]
    });

    return items.map(item => ({
      id: item.id,
      menuId: item.menuId,
      ingredient: {
        id: item.ingredient.id,
        name: item.ingredient.name,
        pyaterochkaSku: item.ingredient.pyaterochkaSku,
        packAmount: item.ingredient.packAmount,
        packPrice: item.ingredient.packPrice,
        createdAt: item.ingredient.createdAt.toISOString(),
      },
      totalAmount: item.totalAmount,
      unit: item.unit,
      isPurchased: item.isPurchased,
      neededDates: item.neededDates.map(d => ({
        id: d.id,
        neededAt: d.neededAt.toISOString(),
      }))
    }));
  }

  async updateShoppingItem(menuId: number, itemId: number, data: UpdateShoppingItemDto): Promise<ShoppingItem> {
    const existing = await prisma.shoppingItem.findFirst({
      where: { id: itemId, menuId }
    });

    if (!existing) {
      throw new NotFoundError('Shopping item not found in this menu');
    }

    await prisma.shoppingItem.update({
      where: { id: itemId },
      data: { isPurchased: data.isPurchased }
    });

    // Return the full updated list or just the item? Let's fetch the item via get logic
    const items = await this.getShoppingList(menuId);
    return items.find(i => i.id === itemId)!;
  }
}

export const shoppingService = new ShoppingService();
