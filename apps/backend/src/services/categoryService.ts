import prisma from '../db/prismaClient';
import { CreateCategoryDto, Category } from '@make-me-menu/shared';
import { NotFoundError, ConflictError } from '../utils/errors';

export class CategoryService {
  async getAll(): Promise<Category[]> {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
    });
    return categories.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString()
    }));
  }

  async create(data: CreateCategoryDto): Promise<Category> {
    const existing = await prisma.category.findUnique({
      where: { name: data.name }
    });
    if (existing) {
      throw new ConflictError(`Category with name "${data.name}" already exists`);
    }

    const created = await prisma.category.create({
      data: { name: data.name }
    });
    
    return {
      ...created,
      createdAt: created.createdAt.toISOString()
    };
  }

  async delete(id: number): Promise<void> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { dishes: { take: 1 } }
    });
    
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    if (category.dishes.length > 0) {
      throw new ConflictError('Cannot delete category with associated dishes');
    }

    await prisma.category.delete({ where: { id } });
  }
}

export const categoryService = new CategoryService();
