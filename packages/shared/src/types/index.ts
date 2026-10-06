import type { Difficulty, DayOfWeek, Unit, MealType, Cook, CookPerson } from '../enums/index';

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
  categoryId?: number | null;
  category: Category | null;
  difficulty: Difficulty;
  cook: Cook;
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

export interface ShoppingItemDate {
  id: number;
  neededAt: string; // ISO date string
}

export interface ShoppingItem {
  id: number;
  menuId: number;
  ingredient: Ingredient;
  /** Aggregated amount in base unit (GRAM, MILLILITER, or PIECE) */
  totalAmount: number;
  /** Base unit stored in DB: GRAM, MILLILITER, or PIECE */
  unit: Unit;
  isPurchased: boolean;
  /** Days when this ingredient is needed */
  neededDates: ShoppingItemDate[];
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
  availableCooks: CookPerson[];
}

export interface AppSettings {
  id: number;
  familySize: number;
  mealsPerDay: number;
  /** Computed: familySize * mealsPerDay. Not stored in DB (ADR-011). */
  targetServings: number;
  daySettings: Record<DayOfWeek, DaySettings>;
}

// ─── Generator ────────────────────────────────────────────────────────────────

export interface GenerationError {
  error: 'INSUFFICIENT_DISHES' | 'NO_SUITABLE_DISHES' | 'MENU_ALREADY_EXISTS';
  message: string;
  details?: {
    mealType?: MealType;
    dayOfWeek?: DayOfWeek;
    required?: number;
    available?: number;
    existingMenuId?: number;
  };
}
