import prisma from '../db/prismaClient';
import { CreateIngredientDto, Ingredient } from '@make-me-menu/shared';
import { ConflictError } from '../utils/errors';

export class IngredientService {
  async getAll(search?: string): Promise<Ingredient[]> {
    const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {};
    const ingredients = await prisma.ingredient.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return ingredients.map(i => ({
      ...i,
      createdAt: i.createdAt.toISOString()
    }));
  }

  async create(data: CreateIngredientDto): Promise<Ingredient> {
    const existing = await prisma.ingredient.findUnique({
      where: { name: data.name }
    });
    if (existing) {
      throw new ConflictError(`Ingredient with name "${data.name}" already exists`);
    }

    const created = await prisma.ingredient.create({
      data: { name: data.name }
    });
    
    return {
      ...created,
      createdAt: created.createdAt.toISOString()
    };
  }
}

export const ingredientService = new IngredientService();
