import { IngredientScaling } from '@make-me-menu/shared';

/**
 * Scales an ingredient amount based on the target servings vs the base recipe servings.
 */
export function scaleIngredient(amount: number, baseServings: number, targetServings: number, scaling: IngredientScaling = IngredientScaling.LINEAR): number {
  if (baseServings <= 0) {
      throw new Error("Base servings must be greater than zero");
  }
  const scaleFactor = targetServings / baseServings;
  if (scaling === IngredientScaling.FIXED) return amount;
  // Explicit application policy for UniTools "damped": square-root scaling.
  if (scaling === IngredientScaling.DAMPED) return amount * Math.sqrt(scaleFactor);
  return amount * scaleFactor;
}
