import prisma from '../../../src/db/prismaClient';
import datasetJson from './unitools-recipes-v1.json';
import { DishStatus, NutritionBasis, RecipeImportResult } from '@make-me-menu/shared';
import { mapUnitoolsRecipe, normalizeIngredientName, UNIT_CATEGORY_NAMES, UnitoolsDatasetSchema } from '../../../src/imports/unitools';

export async function importUnitools(): Promise<RecipeImportResult> {
  // Validate everything before the first write. Data is pinned, so runtime needs no network.
  const dataset = UnitoolsDatasetSchema.parse(datasetJson);
  return prisma.$transaction(async tx => {
    // Serialize imports across requests/processes; reimport never overwrites family edits or decisions.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(741927, 1)`;
    const existingDishes = await tx.dish.findMany({ where: { source: 'UNITOOLS' }, select: { sourceId: true } });
    const exclusions = await tx.recipeImportExclusion.findMany({ where: { source: 'UNITOOLS' } });
    const existingIds = new Set([...existingDishes.map(d => d.sourceId), ...exclusions.map(d => d.sourceId)]);
    const categoryByName = new Map((await tx.category.findMany()).map(c => [c.name, c.id]));
    const existingIngredients = await tx.ingredient.findMany({ orderBy: { id: 'asc' } });
    const ingredientByName = new Map<string, number>();
    for (const ingredient of existingIngredients) {
      const key = normalizeIngredientName(ingredient.name);
      if (!ingredientByName.has(key)) ingredientByName.set(key, ingredient.id);
    }
    // Pick the most frequent Russian name per stable ID (e.g. salt has several contextual names).
    const names = new Map<string, Map<string, number>>();
    for (const recipe of dataset.recipes) for (const ingredient of recipe.ingredients) {
      const variants = names.get(ingredient.id) ?? new Map<string, number>();
      variants.set(ingredient.name.ru, (variants.get(ingredient.name.ru) ?? 0) + 1);
      names.set(ingredient.id, variants);
    }
    const ingredientByExternalId = new Map<string, number>();
    let imported = 0;
    for (const recipe of dataset.recipes) {
      if (existingIds.has(recipe.slug)) continue;
      const mapped = mapUnitoolsRecipe(recipe);
      const categoryName = UNIT_CATEGORY_NAMES[recipe.category];
      let categoryId = categoryByName.get(categoryName);
      if (categoryId === undefined) {
        const category = await tx.category.upsert({ where: { name: categoryName }, create: { name: categoryName }, update: {} });
        categoryId = category.id;
        categoryByName.set(categoryName, categoryId);
      }
      const ingredients = [];
      for (const ingredient of mapped.ingredients) {
        const canonicalName = [...names.get(ingredient.externalId)!.entries()].sort((a, b) => b[1] - a[1])[0]![0];
        const nameKey = normalizeIngredientName(canonicalName);
        let ingredientId = ingredientByExternalId.get(ingredient.externalId) ?? ingredientByName.get(nameKey);
        if (ingredientId === undefined) {
          const created = await tx.ingredient.upsert({ where: { name: canonicalName }, create: { name: canonicalName }, update: {} });
          ingredientId = created.id;
          ingredientByName.set(nameKey, ingredientId);
        }
        ingredientByExternalId.set(ingredient.externalId, ingredientId);
        // Keep the source's contextual wording even when sharing a canonical product.
        const note = [ingredient.name !== canonicalName ? ingredient.name : null, ingredient.note].filter(Boolean).join('; ') || null;
        ingredients.push({ ingredientId, amount: ingredient.amount, unit: ingredient.unit, scaling: ingredient.scaling, note });
      }
      const { ingredients: _ingredients, ...dish } = mapped;
      await tx.dish.create({ data: {
        ...dish, categoryId, status: DishStatus.TRY,
        nutritionBasis: NutritionBasis.PER_SERVING,
        source: 'UNITOOLS', sourceId: recipe.slug, sourceVersion: dataset.version,
        sourceUrl: 'https://theunitools.com/ru/data', sourceLicense: dataset.license,
        ingredients: { create: ingredients },
      } });
      imported++;
    }
    return { imported, skipped: dataset.recipes.length - imported, total: dataset.recipes.length, version: dataset.version };
  }, { timeout: 60000, maxWait: 10000 });
}
