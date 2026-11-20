import { Prisma } from '@prisma/client';
import { DishStatus } from '@make-me-menu/shared';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import prisma from '../db/prismaClient';
import { CatalogSource, parseCatalogRecipes } from '../imports/catalogRecipes';
import { normalizeIngredientName } from '../imports/unitools';

type CatalogEntries = ReturnType<typeof parseCatalogRecipes>;

export async function loadHomeCatalog() {
  const file = resolve(__dirname, '../../../../everyday-recipes-review.json');
  return parseCatalogRecipes(JSON.parse(await readFile(file, 'utf8')), CatalogSource.HOME);
}

async function planImport(tx: Prisma.TransactionClient, entries: CatalogEntries, source: CatalogSource) {
  const existing = await tx.dish.findMany({ where: { source }, select: { sourceId: true } });
  const excluded = await tx.recipeImportExclusion.findMany({ where: { source }, select: { sourceId: true } });
  const known = new Set([...existing, ...excluded].map(recipe => recipe.sourceId));
  return entries.filter(entry => !known.has(entry.dish.sourceId));
}

async function saveEntries(tx: Prisma.TransactionClient, entries: CatalogEntries) {
  const ingredients = new Map<string, number>();
  const categories = new Map<string, number>();
  const existing = await tx.ingredient.findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true } });
  for (const item of existing) {
    const key = normalizeIngredientName(item.name);
    if (!ingredients.has(key)) ingredients.set(key, item.id);
  }

  for (const entry of entries) {
    let categoryId = categories.get(entry.categoryName);
    if (categoryId === undefined) {
      const category = await tx.category.upsert({
        where: { name: entry.categoryName }, update: {}, create: { name: entry.categoryName },
        select: { id: true },
      });
      categoryId = category.id;
      categories.set(entry.categoryName, categoryId);
    }

    const dishIngredients = [];
    for (const { name, amount, unit, note } of entry.ingredients) {
      const key = normalizeIngredientName(name);
      let ingredientId = ingredients.get(key);
      if (ingredientId === undefined) {
        const ingredient = await tx.ingredient.upsert({
          where: { name }, update: {}, create: { name }, select: { id: true },
        });
        ingredientId = ingredient.id;
        ingredients.set(key, ingredientId);
      }
      dishIngredients.push({ ingredientId, amount, unit, note });
    }

    await tx.dish.create({
      data: {
        ...entry.dish, status: DishStatus.TRY, categoryId,
        ingredients: { createMany: { data: dishIngredients } },
      },
      select: { id: true },
    });
  }
}

export async function switchRecipeCatalog(options: { apply: boolean; povarenok?: unknown }) {
  const home = await loadHomeCatalog();
  const povarenok = options.povarenok === undefined ? [] : parseCatalogRecipes(options.povarenok, CatalogSource.POVARENOK);
  return prisma.$transaction(async tx => {
    // Same lock as the previous importer, so two cutovers do not race each other.
    if (options.apply) await tx.$executeRaw`SELECT pg_advisory_xact_lock(741927, 1)`;
    const newHome = await planImport(tx, home, CatalogSource.HOME);
    const newPovarenok = await planImport(tx, povarenok, CatalogSource.POVARENOK);

    // Lock parent rows before checking foreign keys. A concurrent write cannot add
    // a menu item or cooking history between the check and deletion.
    if (options.apply) {
      await tx.$queryRaw`SELECT id FROM "Dish" WHERE source = 'UNITOOLS' ORDER BY id FOR UPDATE`;
    }
    const previous = await tx.dish.findMany({
      where: { source: 'UNITOOLS', archivedAt: null },
      select: {
        id: true, status: true, rating: true, reviewComment: true, lastCookedAt: true,
        createdAt: true, updatedAt: true,
        _count: { select: { menuItems: true, cookingHistory: true } },
      },
    });
    const remove = [];
    const archive = [];
    let favoritesKept = 0;
    for (const dish of previous) {
      if (dish.status === DishStatus.FAVORITE) {
        favoritesKept++;
      } else if (
        dish.status === DishStatus.TRY &&
        !dish._count.menuItems && !dish._count.cookingHistory &&
        dish.lastCookedAt === null && dish.rating === null && dish.reviewComment === null &&
        dish.createdAt.getTime() === dish.updatedAt.getTime()
      ) {
        remove.push(dish.id);
      } else {
        archive.push(dish.id);
      }
    }

    if (options.apply) {
      await saveEntries(tx, [...newHome, ...newPovarenok]);
      await tx.dish.updateMany({ where: { id: { in: archive } }, data: { archivedAt: new Date() } });
      await tx.dish.deleteMany({ where: { id: { in: remove } } });
    }
    return {
      mode: options.apply ? 'apply' : 'dry-run',
      home: { add: newHome.length, skip: home.length - newHome.length },
      povarenok: { add: newPovarenok.length, skip: povarenok.length - newPovarenok.length },
      unitools: { remove: remove.length, archive: archive.length, favoritesKept },
    };
  }, { timeout: 120_000, maxWait: 10_000 });
}
