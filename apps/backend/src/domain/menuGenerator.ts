import { DishSummary, DayOfWeek, Difficulty, MealType, Cook, CookPerson } from '@family-menu/shared';
import { calculateWeights, weightedRandomSelect } from './historyWeighter';

export interface DayConfig {
  date: string; // ISO Date String
  dayOfWeek: DayOfWeek;
  allowedDifficulties: Difficulty[];
  availableCooks?: CookPerson[];
}

export function isCookSuitable(dishCook: Cook, availableCooks?: CookPerson[]): boolean {
  if (!availableCooks || availableCooks.length === 0) return true;
  if (dishCook === Cook.BOTH) {
    return availableCooks.includes(CookPerson.YULIA) || availableCooks.includes(CookPerson.MISHA);
  }
  if (dishCook === Cook.YULIA) {
    return availableCooks.includes(CookPerson.YULIA);
  }
  if (dishCook === Cook.MISHA) {
    return availableCooks.includes(CookPerson.MISHA);
  }
  return true;
}

export interface GenerationContext {
  days: DayConfig[];
  dishes: DishSummary[];
  currentDateStr: string; // Used for history weighting
  randomGenerator: () => number; // Injection for deterministic testing (returns [0, 1))
}

export interface GeneratedMenuItem {
  date: string;
  mealType: MealType;
  dish: DishSummary;
}

export class MenuGenerationError extends Error {
  constructor(
    public readonly code: 'INSUFFICIENT_DISHES' | 'NO_SUITABLE_DISHES',
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'MenuGenerationError';
  }
}

export function generateMenu(context: GenerationContext): GeneratedMenuItem[] {
  const result: GeneratedMenuItem[] = [];
  
  // Separate pools
  const breakfastDishes = context.dishes.filter(d => d.forBreakfast);
  const lunchDishes = context.dishes.filter(d => d.forLunch);
  
  const rng = context.randomGenerator;
  const currentDateStr = context.currentDateStr;

  // --- Generate Breakfasts ---
  // Breakfasts can repeat. Try to match difficulty and cook first.
  for (const day of context.days) {
      // 1. Match allowed difficulty and available cooks
      let available = breakfastDishes.filter(d => 
        day.allowedDifficulties.includes(d.difficulty) && 
        isCookSuitable(d.cook, day.availableCooks)
      );
      
      // 2. Fallback: Match available cooks (any difficulty)
      if (available.length === 0) {
          available = breakfastDishes.filter(d => isCookSuitable(d.cook, day.availableCooks));
      }

      // 3. Fallback: Match difficulty (any cook)
      if (available.length === 0) {
          available = breakfastDishes.filter(d => day.allowedDifficulties.includes(d.difficulty));
      }
      
      // 4. Ultimate Fallback: any breakfast dish
      if (available.length === 0) {
          available = breakfastDishes;
      }
      
      if (available.length === 0) {
          throw new MenuGenerationError(
              'NO_SUITABLE_DISHES',
              `В каталоге вообще нет блюд для завтрака. Добавьте хотя бы одно.`,
              { mealType: MealType.BREAKFAST }
          );
      }
      const weighted = calculateWeights(available, currentDateStr);
      const selected = weightedRandomSelect(weighted, rng());
      if (!selected) {
          throw new MenuGenerationError('NO_SUITABLE_DISHES', 'Failed to select breakfast dish', { date: day.date });
      }
      result.push({
          date: day.date,
          mealType: MealType.BREAKFAST,
          dish: selected
      });
  }

  // --- Generate Lunches ---
  // Lunches should ideally not repeat and match difficulty and cook.
  let remainingLunches = [...lunchDishes];
  const lunchDays = [...context.days];
  
  const getCandidateCount = (day: DayConfig, pool: DishSummary[]) => {
      return pool.filter(d => 
        day.allowedDifficulties.includes(d.difficulty) && 
        isCookSuitable(d.cook, day.availableCooks)
      ).length;
  };
  
  // Pre-sort days to process the most constrained ones first
  lunchDays.sort((a, b) => getCandidateCount(a, remainingLunches) - getCandidateCount(b, remainingLunches));
  
  for (const day of lunchDays) {
      // 1. Strict constraints: Unique + Allowed Difficulty + Available Cook
      let available = remainingLunches.filter(d => 
        day.allowedDifficulties.includes(d.difficulty) && 
        isCookSuitable(d.cook, day.availableCooks)
      );
      
      // 2. Unique + Any Difficulty + Available Cook
      if (available.length === 0) {
          available = remainingLunches.filter(d => isCookSuitable(d.cook, day.availableCooks));
      }

      // 3. Unique + Allowed Difficulty (any cook fallback)
      if (available.length === 0) {
          available = remainingLunches.filter(d => day.allowedDifficulties.includes(d.difficulty));
      }

      // 4. Unique + Any Difficulty + Any Cook
      if (available.length === 0) {
          available = remainingLunches;
      }

      // 5. Repeat allowed + Allowed Difficulty + Available Cook
      if (available.length === 0) {
          available = lunchDishes.filter(d => 
            day.allowedDifficulties.includes(d.difficulty) && 
            isCookSuitable(d.cook, day.availableCooks)
          );
      }

      // 6. Repeat allowed + Available Cook
      if (available.length === 0) {
          available = lunchDishes.filter(d => isCookSuitable(d.cook, day.availableCooks));
      }

      // 7. Ultimate Fallback: Not unique + Any Difficulty
      if (available.length === 0) {
          available = lunchDishes;
      }
      
      if (available.length === 0) {
          throw new MenuGenerationError(
              'NO_SUITABLE_DISHES',
              `В каталоге вообще нет блюд для обеда. Добавьте хотя бы одно.`,
              { mealType: MealType.LUNCH }
          );
      }
      
      const weighted = calculateWeights(available, currentDateStr);
      const selected = weightedRandomSelect(weighted, rng());
      
      if (!selected) {
          throw new MenuGenerationError('NO_SUITABLE_DISHES', 'Failed to select lunch dish', { date: day.date });
      }
      
      result.push({
          date: day.date,
          mealType: MealType.LUNCH,
          dish: selected
      });
      
      // Remove selected from unique pool
      remainingLunches = remainingLunches.filter(d => d.id !== selected.id);
  }

  // Sort result by date then mealType (breakfast first) for predictable output
  result.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.mealType.localeCompare(b.mealType);
  });

  return result;
}
