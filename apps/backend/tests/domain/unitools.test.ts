import { describe, expect, it } from 'vitest';
import { IngredientScaling, Unit, ReviewDishSchema } from '@make-me-menu/shared';
import data from '../fixtures/unitools/unitools-recipes-v1.json';
import { mapUnitoolsRecipe, normalizeIngredientName, UnitoolsDatasetSchema } from '../../src/imports/unitools';
import { scaleIngredient } from '../../src/domain/ingredientScaler';
import { buildShoppingList } from '../../src/domain/shoppingListBuilder';

describe('UniTools dataset', () => {
  it('validates all 501 pinned recipes and their quantities', () => {
    const dataset = UnitoolsDatasetSchema.parse(data);
    expect(dataset.recipes).toHaveLength(501);
    for (const recipe of dataset.recipes) {
      const mapped = mapUnitoolsRecipe(recipe);
      expect(mapped.ingredients).toHaveLength(recipe.ingredients.length);
      expect(mapped.recipe).toContain(recipe.steps[0]!.text.ru);
      expect(mapped.calories).toBe(recipe.nutritionPerServing.calories);
      for (const ingredient of mapped.ingredients) {
        expect(Object.values(Unit)).toContain(ingredient.unit);
        expect(ingredient.amount === null).toBe(ingredient.unit === Unit.TO_TASTE);
      }
    }
  });

  it('does not turn sauces, sides or desserts into a complete lunch', () => {
    const dataset = UnitoolsDatasetSchema.parse(data);
    for (const category of ['sauce', 'side', 'dessert', 'drink', 'bread']) {
      const recipe = dataset.recipes.find(r => r.category === category)!;
      expect(mapUnitoolsRecipe(recipe)).toMatchObject({ forBreakfast: false, forLunch: false });
    }
  });

  it('rejects duplicate recipe IDs before importing', () => {
    expect(UnitoolsDatasetSchema.safeParse({ ...data, recipes: [data.recipes[0], data.recipes[0]] }).success).toBe(false);
  });

  it('rejects unknown units and missing measured quantities', () => {
    const recipe = structuredClone(data.recipes[0]!);
    recipe.ingredients[0]!.unit = 'unknown';
    expect(UnitoolsDatasetSchema.safeParse({ ...data, recipes: [recipe] }).success).toBe(false);
    recipe.ingredients[0]!.unit = 'g';
    recipe.ingredients[0]!.quantity = null;
    expect(UnitoolsDatasetSchema.safeParse({ ...data, recipes: [recipe] }).success).toBe(false);
  });

  it('matches existing ingredient names ignoring case, spacing and ё', () => {
    expect(normalizeIngredientName('  МЁД   цветочный ')).toBe(normalizeIngredientName('мед цветочный'));
  });

  it('keeps fixed quantities and applies explicit damped scaling', () => {
    expect(scaleIngredient(2, 2, 8, IngredientScaling.FIXED)).toBe(2);
    expect(scaleIngredient(2, 2, 8, IngredientScaling.DAMPED)).toBe(4);
    expect(scaleIngredient(2, 2, 8, IngredientScaling.LINEAR)).toBe(8);
  });

  it('keeps to-taste products in shopping without inventing amounts', () => {
    const ingredient = { id: 1, name: 'Соль', createdAt: '' };
    const item = { date: '2026-11-20', dish: { servings: 2, ingredients: [
      { ingredient, amount: null, unit: Unit.TO_TASTE },
    ] } };
    // Only recipe fields used by the shopping domain are needed for this fixture.
    const result = buildShoppingList([item, item] as Parameters<typeof buildShoppingList>[0], 6);
    expect(result).toEqual([{ ingredient, totalAmount: null, unit: Unit.TO_TASTE, neededDates: ['2026-11-20'] }]);
  });

  it('aggregates separate recipe components using the same product', () => {
    const ingredient = { id: 1, name: 'Яйцо', createdAt: '' };
    const item = { date: '2026-11-20', dish: { servings: 2, ingredients: [
      { ingredient, amount: 1, unit: Unit.PIECE }, { ingredient, amount: 2, unit: Unit.PIECE },
    ] } };
    const result = buildShoppingList([item] as Parameters<typeof buildShoppingList>[0], 4);
    expect(result[0]!.totalAmount).toBe(6);
  });

  it('validates a family review independently from the decision', () => {
    expect(ReviewDishSchema.parse({ rating: 5, status: 'REJECTED' }).status).toBe('REJECTED');
    expect(ReviewDishSchema.safeParse({ rating: 0, status: 'FAVORITE' }).success).toBe(false);
    expect(ReviewDishSchema.safeParse({ rating: 6, status: 'TRY' }).success).toBe(false);
  });
});
