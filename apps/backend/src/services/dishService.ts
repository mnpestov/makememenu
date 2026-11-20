import prisma from '../db/prismaClient';
import { CreateDishDto, UpdateDishDto, DishSummary, DishFull, ReviewDishDto } from '@make-me-menu/shared';
import { NotFoundError, ConflictError } from '../utils/errors';

export class DishService {
  private mapToSummary(dish: any): DishSummary {
    return {
      id: dish.id,
      name: dish.name,
      status: dish.status,
      rating: dish.rating,
      reviewComment: dish.reviewComment,
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
      nutritionBasis: dish.nutritionBasis,
      source: dish.source,
      sourceId: dish.sourceId,
      sourceUrl: dish.sourceUrl,
      sourceLicense: dish.sourceLicense,
      archivedAt: dish.archivedAt?.toISOString() ?? null,
      prepMinutes: dish.prepMinutes,
      cookMinutes: dish.cookMinutes,
      totalMinutes: dish.totalMinutes,
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
        scaling: di.scaling,
        note: di.note,
      })),
    };
  }

  async getAll(): Promise<DishSummary[]> {
    const dishes = await prisma.dish.findMany({
      where: { archivedAt: null },
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
        nutritionBasis: data.nutritionBasis,
        calories: data.calories ?? null,
        protein: data.protein ?? null,
        fat: data.fat ?? null,
        carbs: data.carbs ?? null,
        ingredients: {
          create: data.ingredients.map(ing => ({
            ingredientId: ing.ingredientId,
            amount: ing.amount,
            unit: ing.unit,
            scaling: ing.scaling,
            note: ing.note ?? null,
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
        nutritionBasis: data.nutritionBasis,
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
            scaling: ing.scaling,
            note: ing.note ?? null,
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

  async review(id: number, data: ReviewDishDto): Promise<DishFull> {
    const existing = await prisma.dish.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Блюдо не найдено');
    const cookedAt = new Date();
    await prisma.$transaction(async tx => {
      await tx.cookingHistory.create({ data: { dishId: id, cookedAt } });
      await tx.dish.update({ where: { id }, data: {
        rating: data.rating, reviewComment: data.comment || null,
        status: data.status, lastCookedAt: cookedAt,
      } });
    });
    return this.getById(id);
  }

  async delete(id: number): Promise<void> {
    const existing = await prisma.dish.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Dish not found');

    try {
      await prisma.$transaction(async tx => {
        if (existing.source && existing.sourceId) {
          await tx.recipeImportExclusion.upsert({
            where: { source_sourceId: { source: existing.source, sourceId: existing.sourceId } },
            create: { source: existing.source, sourceId: existing.sourceId }, update: {},
          });
        }
        await tx.dish.delete({ where: { id } });
      });
    } catch (err: any) {
      if (err.code === 'P2003') {
        throw new ConflictError('Блюдо используется в меню. После приготовления выберите «Отклонено» в оценке: оно сохранится в истории и больше не попадёт в подбор.');
      }
      throw err;
    }
  }
}

export const dishService = new DishService();
