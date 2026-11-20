import { Difficulty, NutritionBasis, Unit } from '@make-me-menu/shared';
import { z } from 'zod';

export const CatalogSource = { HOME: 'HOME', POVARENOK: 'POVARENOK' } as const;
export type CatalogSource = (typeof CatalogSource)[keyof typeof CatalogSource];

const categories = {
  завтрак: 'Завтрак',
  суп: 'Суп',
  основное: 'Основное блюдо',
  салат: 'Салат',
  закуска: 'Закуска',
  гарнир: 'Гарнир',
  выпечка: 'Выпечка',
  десерт: 'Десерт',
  напиток: 'Напиток',
};

const units: Readonly<Record<string, Unit>> = {
  г: Unit.GRAM, кг: Unit.KILOGRAM, мл: Unit.MILLILITER, л: Unit.LITER,
  шт: Unit.PIECE, 'шт.': Unit.PIECE, 'ст. л.': Unit.TABLESPOON, 'ч. л.': Unit.TEASPOON,
  зубчик: Unit.CLOVE, зубчика: Unit.CLOVE, ломтик: Unit.SLICE, щепотка: Unit.PINCH,
  веточка: Unit.SPRIG, банка: Unit.CAN, лист: Unit.LEAF, 'крупных листьев': Unit.LEAF,
  кочан: Unit.HEAD, кольца: Unit.RING, 'по вкусу': Unit.TO_TASTE,
};
const nutrition = z.object({
  calories: z.number().finite().nonnegative(),
  protein: z.number().finite().nonnegative(),
  fat: z.number().finite().nonnegative(),
  carbs: z.number().finite().nonnegative(),
});

const recipeSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(300),
  category: z.enum(['завтрак', 'суп', 'основное', 'салат', 'закуска', 'гарнир', 'выпечка', 'десерт', 'напиток']),
  servings: z.number().int().positive().max(100),
  difficulty: z.nativeEnum(Difficulty).optional(),
  ingredients: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    amount: z.number().finite().positive().nullable(),
    unit: z.string().refine(unit => Object.hasOwn(units, unit), 'Неизвестная единица измерения'),
    note: z.string().trim().max(1000).optional(),
  }).refine(i => (i.amount === null) === (i.unit === 'по вкусу'), 'Проверьте количество')).min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
  timeMinutes: z.number().int().positive().max(10000).optional(),
  nutritionPerServing: nutrition.nullable(),
  nutritionPer100g: nutrition.nullable().optional(),
  sourceUrl: z.string().url().nullable(),
}).refine(data => data.steps.join('\n').length <= 9500, 'Слишком длинный рецепт');

export function parseCatalogRecipes(input: unknown, source: CatalogSource) {
  const ids = new Set<string>();
  return z.array(recipeSchema).min(1).parse(input).map(recipe => {
    let sourceUrl: string | null = null;
    if (source === CatalogSource.POVARENOK) {
      const match = recipe.sourceUrl?.match(/^https:\/\/(?:www\.)?povarenok\.ru\/recipes\/show\/([1-9]\d*)\/?$/);
      if (!match || match[1] !== recipe.id) {
        throw new Error(`Некорректная ссылка или ID «Поварёнка»: ${recipe.name}`);
      }
      sourceUrl = `https://www.povarenok.ru/recipes/show/${recipe.id}/`;
    } else if (recipe.sourceUrl !== null) {
      throw new Error(`У авторского рецепта должен быть пустой sourceUrl: ${recipe.name}`);
    }
    if (ids.has(recipe.id)) throw new Error(`Дублирующийся ID рецепта: ${recipe.id}`);
    ids.add(recipe.id);
    const nutritionValues = recipe.nutritionPerServing ?? recipe.nutritionPer100g;
    return {
      categoryName: categories[recipe.category],
      ingredients: recipe.ingredients.map(i => ({
        ...i, unit: units[i.unit]!, note: i.note ?? (i.unit === 'крупных листьев' ? 'Крупные листья' : null),
      })),
      dish: {
        source, sourceId: recipe.id, sourceUrl,
        name: recipe.name, servings: recipe.servings,
        difficulty: recipe.difficulty ?? Difficulty.MEDIUM,
        forBreakfast: recipe.category === 'завтрак',
        forLunch: recipe.category === 'суп' || recipe.category === 'основное',
        totalMinutes: recipe.timeMinutes ?? null,
        nutritionBasis: recipe.nutritionPerServing || !nutritionValues ? NutritionBasis.PER_SERVING : NutritionBasis.PER_100G,
        ...nutritionValues,
        recipe: recipe.steps.map((step, index) => `${index + 1}. ${step}`).join('\n\n'),
      },
    };
  });
}
