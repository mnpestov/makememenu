import { describe, it, expect } from 'vitest';
import { MealType, Difficulty, DayOfWeek, Cook, CookPerson } from '@family-menu/shared';
import { generateMenu, GenerationContext, DayConfig } from '../../src/domain/menuGenerator';

describe('menuGenerator', () => {
  const baseDish = {
    category: { id: 1, name: 'C', createdAt: '' },
    servings: 2,
    cook: Cook.BOTH,
    lastCookedAt: null,
    createdAt: '',
    updatedAt: ''
  };

  const breakfast1 = { ...baseDish, id: 1, name: 'B1', difficulty: Difficulty.EASY, forBreakfast: true, forLunch: false };
  const breakfast2 = { ...baseDish, id: 2, name: 'B2', difficulty: Difficulty.MEDIUM, forBreakfast: true, forLunch: false };
  
  const lunch1 = { ...baseDish, id: 3, name: 'L1', difficulty: Difficulty.EASY, forBreakfast: false, forLunch: true };
  const lunch2 = { ...baseDish, id: 4, name: 'L2', difficulty: Difficulty.MEDIUM, forBreakfast: false, forLunch: true };
  const lunch3 = { ...baseDish, id: 5, name: 'L3', difficulty: Difficulty.HARD, forBreakfast: false, forLunch: true };

  const days: DayConfig[] = [
    { date: '2026-10-05', dayOfWeek: DayOfWeek.MONDAY, allowedDifficulties: [Difficulty.EASY, Difficulty.MEDIUM] },
    { date: '2026-10-06', dayOfWeek: DayOfWeek.TUESDAY, allowedDifficulties: [Difficulty.EASY] },
  ];

  it('should generate a menu respecting forBreakfast and forLunch', () => {
    const context: GenerationContext = {
      days,
      dishes: [breakfast1, lunch1, lunch2],
      currentDateStr: '2026-10-05T00:00:00Z',
      randomGenerator: () => 0.5 // deterministic
    };

    const menu = generateMenu(context);
    
    // 2 days * 2 meals = 4 items
    expect(menu).toHaveLength(4);
    
    const breakfasts = menu.filter(m => m.mealType === MealType.BREAKFAST);
    const lunches = menu.filter(m => m.mealType === MealType.LUNCH);
    
    expect(breakfasts).toHaveLength(2);
    // Breakfasts must only use forBreakfast dishes
    expect(breakfasts.every(b => b.dish.forBreakfast)).toBe(true);
    
    expect(lunches).toHaveLength(2);
    // Lunches must only use forLunch dishes
    expect(lunches.every(l => l.dish.forLunch)).toBe(true);
  });

  it('breakfasts can repeat, lunches cannot', () => {
    // Provide only 1 breakfast dish. It should be used twice without throwing.
    // Provide 2 lunch dishes. They should be used once each.
    const context: GenerationContext = {
      days,
      dishes: [breakfast1, lunch1, lunch2],
      currentDateStr: '2026-10-05T00:00:00Z',
      randomGenerator: () => 0.1
    };

    const menu = generateMenu(context);
    
    const breakfasts = menu.filter(m => m.mealType === MealType.BREAKFAST);
    expect(breakfasts[0]!.dish.id).toBe(breakfast1.id);
    expect(breakfasts[1]!.dish.id).toBe(breakfast1.id);
    
    const lunches = menu.filter(m => m.mealType === MealType.LUNCH);
    expect(lunches[0]!.dish.id).not.toBe(lunches[1]!.dish.id);
  });

  it('should respect difficulty constraints per day', () => {
    // Tuesday only allows EASY.
    const context: GenerationContext = {
      days,
      dishes: [breakfast1, breakfast2, lunch1, lunch2],
      currentDateStr: '2026-10-05T00:00:00Z',
      // Always picking the last available (if multiple) to test constraints
      randomGenerator: () => 0.99
    };

    const menu = generateMenu(context);
    
    const tuesdayMenu = menu.filter(m => m.date === '2026-10-06');
    expect(tuesdayMenu).toHaveLength(2);
    
    expect(tuesdayMenu.find(m => m.mealType === MealType.BREAKFAST)?.dish.difficulty).toBe(Difficulty.EASY);
    expect(tuesdayMenu.find(m => m.mealType === MealType.LUNCH)?.dish.difficulty).toBe(Difficulty.EASY);
  });

  it('should sort days to handle most constrained first (ADR-013) avoiding false failures', () => {
    // Imagine 2 days: 
    // Monday allows [EASY, MEDIUM]
    // Tuesday allows [EASY]
    //
    // Dishes available for lunch:
    // L1 (EASY)
    // L2 (MEDIUM)
    //
    // If we process Monday first and random picks L1 (EASY), 
    // then Tuesday has NO dishes (because L1 is used, L2 is MEDIUM and not allowed).
    //
    // ADR-013 says: sort days by number of available candidates.
    // Tuesday has 1 candidate (L1).
    // Monday has 2 candidates (L1, L2).
    // So Tuesday is processed first, gets L1.
    // Monday is processed next, gets L2.
    // Menu generation succeeds.
    
    const context: GenerationContext = {
      days,
      dishes: [breakfast1, lunch1, lunch2], // lunch1 = EASY, lunch2 = MEDIUM
      currentDateStr: '2026-10-05T00:00:00Z',
      // Return 0.0 to pick the first available dish if sorted naively
      randomGenerator: () => 0.0
    };

    // If sorting doesn't work, this will throw an error
    const menu = generateMenu(context);
    
    const lunches = menu.filter(m => m.mealType === MealType.LUNCH);
    
    const mondayLunch = lunches.find(m => m.date === '2026-10-05');
    const tuesdayLunch = lunches.find(m => m.date === '2026-10-06');
    
    expect(tuesdayLunch?.dish.id).toBe(lunch1.id); // Had to be EASY
    expect(mondayLunch?.dish.id).toBe(lunch2.id);  // Picked the remaining MEDIUM
  });

  it('should gracefully reuse dishes when not enough unique lunches are available', () => {
    // Only 1 lunch dish for 2 days
    const context: GenerationContext = {
      days,
      dishes: [breakfast1, lunch1],
      currentDateStr: '2026-10-05T00:00:00Z',
      randomGenerator: () => 0.5
    };

    const menu = generateMenu(context);
    expect(menu.length).toBe(4); // 2 days * 2 meals
    const lunches = menu.filter(m => m.mealType === MealType.LUNCH);
    expect(lunches.length).toBe(2);
    expect(lunches[0]?.dish.id).toBe(lunch1.id);
    expect(lunches[1]?.dish.id).toBe(lunch1.id);
  });

  describe('cook constraints', () => {
    const yuliaLunch = { ...lunch1, id: 101, name: 'Yulia Lunch', cook: Cook.YULIA };
    const mishaLunch = { ...lunch2, id: 102, name: 'Misha Lunch', cook: Cook.MISHA };
    const bothLunch = { ...lunch3, id: 103, name: 'Both Lunch', difficulty: Difficulty.EASY, cook: Cook.BOTH };

    it('should select only Yulia or Both dishes when only Yulia can cook', () => {
      const singleDay: DayConfig[] = [
        { 
          date: '2026-10-05', 
          dayOfWeek: DayOfWeek.MONDAY, 
          allowedDifficulties: [Difficulty.EASY, Difficulty.MEDIUM],
          availableCooks: [CookPerson.YULIA]
        }
      ];

      const context: GenerationContext = {
        days: singleDay,
        dishes: [breakfast1, yuliaLunch, mishaLunch, bothLunch],
        currentDateStr: '2026-10-05T00:00:00Z',
        randomGenerator: () => 0.0 // picks first available suitable
      };

      const menu = generateMenu(context);
      const lunchItem = menu.find(m => m.mealType === MealType.LUNCH);
      expect(lunchItem).toBeDefined();
      expect([Cook.YULIA, Cook.BOTH]).toContain(lunchItem?.dish.cook);
      expect(lunchItem?.dish.cook).not.toBe(Cook.MISHA);
    });

    it('should select only Misha or Both dishes when only Misha can cook', () => {
      const singleDay: DayConfig[] = [
        { 
          date: '2026-10-05', 
          dayOfWeek: DayOfWeek.MONDAY, 
          allowedDifficulties: [Difficulty.EASY, Difficulty.MEDIUM],
          availableCooks: [CookPerson.MISHA]
        }
      ];

      const context: GenerationContext = {
        days: singleDay,
        dishes: [breakfast1, yuliaLunch, mishaLunch, bothLunch],
        currentDateStr: '2026-10-05T00:00:00Z',
        randomGenerator: () => 0.0
      };

      const menu = generateMenu(context);
      const lunchItem = menu.find(m => m.mealType === MealType.LUNCH);
      expect(lunchItem).toBeDefined();
      expect([Cook.MISHA, Cook.BOTH]).toContain(lunchItem?.dish.cook);
      expect(lunchItem?.dish.cook).not.toBe(Cook.YULIA);
    });

    it('can select any dish when both Yulia and Misha can cook', () => {
      const singleDay: DayConfig[] = [
        { 
          date: '2026-10-05', 
          dayOfWeek: DayOfWeek.MONDAY, 
          allowedDifficulties: [Difficulty.EASY, Difficulty.MEDIUM],
          availableCooks: [CookPerson.YULIA, CookPerson.MISHA]
        }
      ];

      const context: GenerationContext = {
        days: singleDay,
        dishes: [breakfast1, mishaLunch],
        currentDateStr: '2026-10-05T00:00:00Z',
        randomGenerator: () => 0.5
      };

      const menu = generateMenu(context);
      const lunchItem = menu.find(m => m.mealType === MealType.LUNCH);
      expect(lunchItem?.dish.id).toBe(mishaLunch.id);
    });
  });
});
