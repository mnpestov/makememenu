import type { Difficulty, DayOfWeek, Unit, MealType } from '../enums/index.js';

// ─── Category ────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  createdAt: string;
}

// ─── Ingredient ───────────────────────────────────────────────────────────────

export interface Ingredient {
  id: number;
  name: string;
  createdAt: string;
}

// ─── Dish ────────────────────────────────────────────────────────────────────

export interface DishIngredientItem {
  ingredient: Ingredient;
  amount: number;
  unit: Unit;
}

export interface DishSummary {
  id: number;
  name: string;
  category: Category;
  difficulty: Difficulty;
  servings: number;
  forBreakfast: boolean;
  forLunch: boolean;
  lastCookedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DishFull extends DishSummary {
  recipe: string | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  ingredients: DishIngredientItem[];
}

// ─── Menu ────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: number;
  menuId: number;
  mealType: MealType;
  date: string; // ISO date string
  dish: DishSummary;
}

export interface WeeklyMenuFull {
  id: number;
  weekStart: string; // ISO date string, Monday 00:00 UTC
  items: MenuItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Shopping List ────────────────────────────────────────────────────────────

export interface ShoppingItem {
  id: number;
  menuId: number;
  ingredient: Ingredient;
  totalAmount: number;
  unit: Unit;
  isPurchased: boolean;
  neededOnDates: string[]; // ISO date strings
}

// ─── Cooking History ──────────────────────────────────────────────────────────

export interface CookingHistoryEntry {
  id: number;
  dishId: number;
  cookedAt: string;
  menuItemId: number | null;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface DaySettings {
  allowedDifficulties: Difficulty[];
}

export interface AppSettings {
  familySize: number;
  mealsPerDay: number;
  targetServings: number; // = familySize * mealsPerDay
  daySettings: Record<DayOfWeek, DaySettings>;
}

// ─── Generator Error ──────────────────────────────────────────────────────────

export interface GenerationError {
  error: 'INSUFFICIENT_DISHES' | 'NO_SUITABLE_DISHES';
  message: string;
  details: {
    mealType: MealType;
    dayOfWeek?: DayOfWeek;
    required?: number;
    available?: number;
  };
}
