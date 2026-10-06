import { describe, it, expect } from 'vitest';
import { Unit, MealType, Difficulty } from '@family-menu/shared';
import { buildShoppingList } from '../../src/domain/shoppingListBuilder';

describe('shoppingListBuilder', () => {
  const mockIngredientMilk = { id: 1, name: 'Молоко', createdAt: '' };
  const mockIngredientEgg = { id: 2, name: 'Яйцо', createdAt: '' };
  const mockIngredientPotato = { id: 3, name: 'Картофель', createdAt: '' };

  const mockCategory = { id: 1, name: 'Test', createdAt: '' };

  const baseDishSummary = {
    category: mockCategory,
    difficulty: Difficulty.EASY,
    forBreakfast: true,
    forLunch: true,
    lastCookedAt: null,
    createdAt: '',
    updatedAt: ''
  };

  const mockDishOmelet = {
    ...baseDishSummary,
    id: 1,
    name: 'Омлет',
    servings: 2, // base recipe on 2 servings
    ingredients: [
      { ingredient: mockIngredientMilk, amount: 100, unit: Unit.MILLILITER },
      { ingredient: mockIngredientEgg, amount: 4, unit: Unit.PIECE },
    ]
  };

  const mockDishPancakes = {
    ...baseDishSummary,
    id: 2,
    name: 'Блины',
    servings: 4, // base recipe on 4 servings
    ingredients: [
      { ingredient: mockIngredientMilk, amount: 0.5, unit: Unit.LITER }, // will be normalized to 500ml
      { ingredient: mockIngredientEgg, amount: 2, unit: Unit.PIECE },
    ]
  };

  const mockDishMashedPotatoes = {
    ...baseDishSummary,
    id: 3,
    name: 'Пюре',
    servings: 2,
    ingredients: [
      { ingredient: mockIngredientPotato, amount: 500, unit: Unit.GRAM },
      { ingredient: mockIngredientMilk, amount: 50, unit: Unit.MILLILITER },
    ]
  };

  it('should aggregate identical ingredients and keep dates', () => {
    const menuItems: any[] = [
      { id: 101, date: '2026-10-05', mealType: MealType.BREAKFAST, dish: mockDishOmelet }, // target: 4 servings. Milk: 200ml, Egg: 8pcs
      { id: 102, date: '2026-10-06', mealType: MealType.BREAKFAST, dish: mockDishPancakes }, // target: 4 servings. Milk: 500ml, Egg: 2pcs
    ];

    const targetServings = 4;
    const shoppingList = buildShoppingList(menuItems, targetServings);

    // Expected:
    // Milk (1): 200ml + 500ml = 700ml. Dates: 2026-10-05, 2026-10-06
    // Egg (2): 8pcs + 2pcs = 10pcs. Dates: 2026-10-05, 2026-10-06
    
    expect(shoppingList).toHaveLength(2);
    
    const milk = shoppingList.find(i => i.ingredient.id === 1);
    expect(milk).toBeDefined();
    expect(milk?.totalAmount).toBe(700);
    expect(milk?.unit).toBe(Unit.MILLILITER);
    expect(milk?.neededDates).toEqual(['2026-10-05', '2026-10-06']);

    const egg = shoppingList.find(i => i.ingredient.id === 2);
    expect(egg).toBeDefined();
    expect(egg?.totalAmount).toBe(10);
    expect(egg?.unit).toBe(Unit.PIECE);
  });

  it('should not aggregate incompatible units', () => {
    // If somehow potato is added as PIECE in one dish and GRAM in another
    const weirdDish1 = {
      ...baseDishSummary,
      id: 4, name: 'Странное 1', servings: 1,
      ingredients: [{ ingredient: mockIngredientPotato, amount: 3, unit: Unit.PIECE }]
    };
    const weirdDish2 = {
      ...baseDishSummary,
      id: 5, name: 'Странное 2', servings: 1,
      ingredients: [{ ingredient: mockIngredientPotato, amount: 500, unit: Unit.GRAM }]
    };

    const menuItems: any[] = [
      { id: 101, date: '2026-10-05', mealType: MealType.LUNCH, dish: weirdDish1 },
      { id: 102, date: '2026-10-05', mealType: MealType.BREAKFAST, dish: weirdDish2 },
    ];

    const shoppingList = buildShoppingList(menuItems, 1);
    
    // Should result in two separate shopping items for Potato
    const potatoes = shoppingList.filter(i => i.ingredient.id === 3);
    expect(potatoes).toHaveLength(2);
    
    const pcs = potatoes.find(p => p.unit === Unit.PIECE);
    const grm = potatoes.find(p => p.unit === Unit.GRAM);
    
    expect(pcs?.totalAmount).toBe(3);
    expect(grm?.totalAmount).toBe(500);
  });
  
  it('aggregates breakfast and lunch properly (recalculation logic)', () => {
    const menuItems: any[] = [
      { id: 101, date: '2026-10-05', mealType: MealType.BREAKFAST, dish: mockDishOmelet }, // Milk: 50ml, Egg: 2 (target 1)
      { id: 102, date: '2026-10-05', mealType: MealType.LUNCH, dish: mockDishMashedPotatoes }, // Milk: 25ml, Potato: 250g (target 1)
    ];

    const targetServings = 1;
    const shoppingList = buildShoppingList(menuItems, targetServings);

    // Dates should be deduplicated ('2026-10-05' appears once)
    const milk = shoppingList.find(i => i.ingredient.id === 1);
    expect(milk?.totalAmount).toBe(75);
    expect(milk?.neededDates).toEqual(['2026-10-05']);
  });
});
