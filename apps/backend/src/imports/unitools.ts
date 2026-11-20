import { z } from 'zod';
import { Difficulty, IngredientScaling, Unit } from '@make-me-menu/shared';

const localized = z.object({ ru: z.string().trim().min(1) });
const quantity = z.number().finite().positive();
const units = {
  g: Unit.GRAM, kg: Unit.KILOGRAM, ml: Unit.MILLILITER, l: Unit.LITER,
  piece: Unit.PIECE, tbsp: Unit.TABLESPOON, tsp: Unit.TEASPOON,
  clove: Unit.CLOVE, pinch: Unit.PINCH, sprig: Unit.SPRIG, slice: Unit.SLICE,
  toTaste: Unit.TO_TASTE,
} as const;

export const UnitoolsRecipeSchema = z.object({
  slug: z.string().min(1),
  name: localized,
  summary: localized,
  category: z.enum(['main', 'soup', 'dessert', 'snack', 'breakfast', 'bread', 'side', 'salad', 'sauce', 'drink']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  baseServings: z.number().int().positive(),
  prepMinutes: z.number().int().nonnegative(),
  cookMinutes: z.number().int().nonnegative(),
  nutritionPerServing: z.object({
    calories: z.number().finite().nonnegative(), protein: z.number().finite().nonnegative(),
    fat: z.number().finite().nonnegative(), carbs: z.number().finite().nonnegative(),
  }),
  ingredients: z.array(z.object({
    id: z.string().min(1), name: localized, quantity: quantity.nullable(),
    unit: z.enum(['g', 'kg', 'ml', 'l', 'piece', 'tbsp', 'tsp', 'clove', 'pinch', 'sprig', 'slice', 'toTaste']),
    scaling: z.enum(['linear', 'damped', 'fixed']),
    note: localized.nullable(),
  }).refine(i => i.unit === 'toTaste' ? i.quantity === null : i.quantity !== null,
    'Только количество «по вкусу» может быть пустым')).min(1),
  steps: z.array(z.object({ text: localized, minutes: z.number().nonnegative().nullable() })).min(1),
});

export const UnitoolsDatasetSchema = z.object({
  name: z.literal('UniTools World Recipes'), version: z.string().min(1),
  license: z.literal('CC BY-SA 4.0'),
  recipes: z.array(UnitoolsRecipeSchema).min(1),
}).superRefine((data, ctx) => {
  const slugs = new Set<string>();
  data.recipes.forEach((recipe, index) => {
    if (slugs.has(recipe.slug)) ctx.addIssue({ code: 'custom', path: ['recipes', index, 'slug'], message: 'Повторный ID рецепта' });
    slugs.add(recipe.slug);
    if (new Set(recipe.ingredients.map(i => i.id)).size !== recipe.ingredients.length) {
      ctx.addIssue({ code: 'custom', path: ['recipes', index, 'ingredients'], message: 'Повторный ID ингредиента' });
    }
  });
});

export type UnitoolsRecipe = z.infer<typeof UnitoolsRecipeSchema>;
export const UNIT_CATEGORY_NAMES = {
  main: 'Основное блюдо', soup: 'Суп', dessert: 'Десерт', snack: 'Закуска', breakfast: 'Завтрак',
  bread: 'Хлеб', side: 'Гарнир', salad: 'Салат', sauce: 'Соус', drink: 'Напиток',
} as const;

export function mapUnitoolsRecipe(recipe: UnitoolsRecipe) {
  return {
    name: recipe.name.ru,
    difficulty: { easy: Difficulty.EASY, medium: Difficulty.MEDIUM, hard: Difficulty.HARD }[recipe.difficulty],
    servings: recipe.baseServings,
    forBreakfast: recipe.category === 'breakfast',
    // Accompaniments are kept in the library but need manual meal-type selection.
    forLunch: recipe.category === 'main' || recipe.category === 'soup',
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    ...recipe.nutritionPerServing,
    recipe: `${recipe.summary.ru}\n\n${recipe.steps.map((s, i) => `${i + 1}. ${s.text.ru}`).join('\n\n')}`,
    ingredients: recipe.ingredients.map(i => ({
      externalId: i.id, name: i.name.ru, amount: i.quantity, unit: units[i.unit],
      scaling: { linear: IngredientScaling.LINEAR, damped: IngredientScaling.DAMPED, fixed: IngredientScaling.FIXED }[i.scaling],
      note: i.note?.ru ?? null,
    })),
  };
}

export function normalizeIngredientName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
}
