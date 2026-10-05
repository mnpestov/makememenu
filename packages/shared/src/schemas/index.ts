import { z } from 'zod';
import { Difficulty, MealType, Unit, DayOfWeek } from '../enums/index';

// ─── Category ────────────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;

// ─── Ingredient ───────────────────────────────────────────────────────────────

export const CreateIngredientSchema = z.object({
  name: z.string().min(1).max(200),
});

export type CreateIngredientDto = z.infer<typeof CreateIngredientSchema>;

// ─── Dish ────────────────────────────────────────────────────────────────────

export const DishIngredientInputSchema = z.object({
  ingredientId: z.number().int().positive(),
  amount: z.number().positive(),
  unit: z.enum([Unit.GRAM, Unit.KILOGRAM, Unit.MILLILITER, Unit.LITER, Unit.PIECE]),
});

export type DishIngredientInput = z.infer<typeof DishIngredientInputSchema>;

export const CreateDishSchema = z.object({
  name: z.string().min(1).max(300),
  categoryId: z.number().int().positive(),
  difficulty: z.enum([Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD]),
  servings: z.number().int().positive(),
  forBreakfast: z.boolean(),
  forLunch: z.boolean(),
  recipe: z.string().max(10000).nullable().optional(),
  calories: z.number().nonnegative().nullable().optional(),
  protein: z.number().nonnegative().nullable().optional(),
  fat: z.number().nonnegative().nullable().optional(),
  carbs: z.number().nonnegative().nullable().optional(),
  ingredients: z.array(DishIngredientInputSchema),
}).refine(
  (data) => data.forBreakfast || data.forLunch,
  { message: 'Блюдо должно быть разрешено хотя бы для одного приёма пищи' }
);

export type CreateDishDto = z.infer<typeof CreateDishSchema>;

export const UpdateDishSchema = CreateDishSchema;
export type UpdateDishDto = z.infer<typeof UpdateDishSchema>;

// ─── Menu Generation ─────────────────────────────────────────────────────────

export const GenerateMenuSchema = z.object({
  weekStart: z.string().datetime(),
});

export type GenerateMenuDto = z.infer<typeof GenerateMenuSchema>;

// ─── Menu Item Replacement ────────────────────────────────────────────────────

export const ReplaceMenuItemSchema = z.object({
  dishId: z.number().int().positive(),
});

export type ReplaceMenuItemDto = z.infer<typeof ReplaceMenuItemSchema>;

export const RandomReplaceMenuItemSchema = z.object({
  excludeDishIds: z.array(z.number().int().positive()).optional(),
});

export type RandomReplaceMenuItemDto = z.infer<typeof RandomReplaceMenuItemSchema>;

// ─── Shopping List ────────────────────────────────────────────────────────────

export const UpdateShoppingItemSchema = z.object({
  isPurchased: z.boolean(),
});

export type UpdateShoppingItemDto = z.infer<typeof UpdateShoppingItemSchema>;

// ─── Settings ────────────────────────────────────────────────────────────────

const DaySettingsSchema = z.object({
  allowedDifficulties: z.array(
    z.enum([Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD])
  ).min(1),
});

export const UpdateSettingsSchema = z.object({
  familySize: z.number().int().positive().max(20),
  mealsPerDay: z.number().int().min(1).max(5),
  daySettings: z.object({
    [DayOfWeek.MONDAY]: DaySettingsSchema,
    [DayOfWeek.TUESDAY]: DaySettingsSchema,
    [DayOfWeek.WEDNESDAY]: DaySettingsSchema,
    [DayOfWeek.THURSDAY]: DaySettingsSchema,
    [DayOfWeek.FRIDAY]: DaySettingsSchema,
    [DayOfWeek.SATURDAY]: DaySettingsSchema,
    [DayOfWeek.SUNDAY]: DaySettingsSchema,
  }),
});

export type UpdateSettingsDto = z.infer<typeof UpdateSettingsSchema>;
