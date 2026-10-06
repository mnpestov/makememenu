import { Unit, DishSummary, MenuItem, Ingredient, DishIngredientItem } from '@make-me-menu/shared';
import { normalizeUnit } from './unitNormalizer';
import { scaleIngredient } from './ingredientScaler';

export interface ShoppingItemDraft {
  ingredient: Ingredient;
  totalAmount: number;
  unit: Unit;
  neededDates: string[]; // ISO date strings
}

export function buildShoppingList(
  menuItems: (MenuItem & { dish: DishSummary & { ingredients: DishIngredientItem[] } })[],
  targetServings: number
): ShoppingItemDraft[] {
  // Key format: `${ingredientId}_${baseUnit}`
  const map = new Map<string, ShoppingItemDraft>();
  
  for (const item of menuItems) {
    const dish = item.dish;
    const dateStr = item.date;

    for (const dishIngredient of dish.ingredients) {
      const scaledAmount = scaleIngredient(dishIngredient.amount, dish.servings, targetServings);
      const normalized = normalizeUnit(scaledAmount, dishIngredient.unit);
      
      const key = `${dishIngredient.ingredient.id}_${normalized.unit}`;
      
      const existing = map.get(key);
      if (existing) {
        existing.totalAmount += normalized.amount;
        if (!existing.neededDates.includes(dateStr)) {
          existing.neededDates.push(dateStr);
        }
      } else {
        map.set(key, {
          ingredient: dishIngredient.ingredient,
          totalAmount: normalized.amount,
          unit: normalized.unit,
          neededDates: [dateStr]
        });
      }
    }
  }

  // Sort neededDates for consistent output
  const result = Array.from(map.values());
  for (const draft of result) {
    draft.neededDates.sort();
  }

  // Sort overall list by ingredient id, then unit
  result.sort((a, b) => {
      if (a.ingredient.id !== b.ingredient.id) return a.ingredient.id - b.ingredient.id;
      return a.unit.localeCompare(b.unit);
  });

  return result;
}
