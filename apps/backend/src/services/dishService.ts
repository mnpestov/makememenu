import prisma from '../db/prismaClient';
import { CreateDishDto, UpdateDishDto, DishSummary, DishFull } from '@make-me-menu/shared';
import { NotFoundError, ConflictError } from '../utils/errors';

export class DishService {
  private mapToSummary(dish: any): DishSummary {
    return {
      id: dish.id,
      name: dish.name,
      category: dish.category ? {
        id: dish.category.id,
        name: dish.category.name,
        createdAt: dish.category.createdAt.toISOString(),
      } : null,
      difficulty: dish.difficulty,
      cook: dish.cook,
      servings: dish.servings,
      forBreakfast: dish.forBreakfast,
      forLunch: dish.forLunch,
      lastCookedAt: dish.lastCookedAt ? dish.lastCookedAt.toISOString() : null,
      createdAt: dish.createdAt.toISOString(),
      updatedAt: dish.updatedAt.toISOString(),
    };
  }

  private mapToFull(dish: any): DishFull {
    return {
      ...this.mapToSummary(dish),
      recipe: dish.recipe,
      calories: dish.calories,
      protein: dish.protein,
      fat: dish.fat,
      carbs: dish.carbs,
      ingredients: dish.ingredients.map((di: any) => ({
        ingredient: {
          id: di.ingredient.id,
          name: di.ingredient.name,
          createdAt: di.ingredient.createdAt.toISOString(),
        },
        amount: di.amount,
        unit: di.unit,
      })),
    };
  }

  async getAll(): Promise<DishSummary[]> {
    const dishes = await prisma.dish.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return dishes.map(d => this.mapToSummary(d));
  }

  async getById(id: number): Promise<DishFull> {
    const dish = await prisma.dish.findUnique({
      where: { id },
      include: {
        category: true,
        ingredients: {
          include: { ingredient: true }
        }
      }
    });

    if (!dish) {
      throw new NotFoundError('Dish not found');
    }

    return this.mapToFull(dish);
  }

  async create(data: CreateDishDto): Promise<DishFull> {
    // Validate category exists if provided
    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw new NotFoundError('Category not found');
    }

    // Create dish with nested ingredients
    const created = await prisma.dish.create({
      data: {
        name: data.name,
        categoryId: data.categoryId ?? null,
        difficulty: data.difficulty,
        cook: data.cook,
        servings: data.servings,
        forBreakfast: data.forBreakfast,
        forLunch: data.forLunch,
        recipe: data.recipe ?? null,
        calories: data.calories ?? null,
        protein: data.protein ?? null,
        fat: data.fat ?? null,
        carbs: data.carbs ?? null,
        ingredients: {
          create: data.ingredients.map(ing => ({
            ingredientId: ing.ingredientId,
            amount: ing.amount,
            unit: ing.unit,
          }))
        }
      },
      include: {
        category: true,
        ingredients: {
          include: { ingredient: true }
        }
      }
    });

    return this.mapToFull(created);
  }

  async update(id: number, data: UpdateDishDto): Promise<DishFull> {
    const existing = await prisma.dish.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Dish not found');

    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw new NotFoundError('Category not found');
    }

    const updated = await prisma.dish.update({
      where: { id },
      data: {
        name: data.name,
        categoryId: data.categoryId ?? null,
        difficulty: data.difficulty,
        cook: data.cook,
        servings: data.servings,
        forBreakfast: data.forBreakfast,
        forLunch: data.forLunch,
        recipe: data.recipe ?? null,
        calories: data.calories ?? null,
        protein: data.protein ?? null,
        fat: data.fat ?? null,
        carbs: data.carbs ?? null,
        // Replace all ingredients
        ingredients: {
          deleteMany: {},
          create: data.ingredients.map(ing => ({
            ingredientId: ing.ingredientId,
            amount: ing.amount,
            unit: ing.unit,
          }))
        }
      },
      include: {
        category: true,
        ingredients: {
          include: { ingredient: true }
        }
      }
    });

    return this.mapToFull(updated);
  }

  async delete(id: number): Promise<void> {
    const existing = await prisma.dish.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Dish not found');

    try {
      await prisma.dish.delete({ where: { id } });
    } catch (err: any) {
      if (err.code === 'P2003') {
        throw new ConflictError('Невозможно удалить блюдо, так как оно уже используется в сгенерированном меню.');
      }
      throw err;
    }
  }
}

export const dishService = new DishService();
