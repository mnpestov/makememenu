/**
 * Scales an ingredient amount based on the target servings vs the base recipe servings.
 */
export function scaleIngredient(amount: number, baseServings: number, targetServings: number): number {
  if (baseServings <= 0) {
      throw new Error("Base servings must be greater than zero");
  }
  const scaleFactor = targetServings / baseServings;
  return amount * scaleFactor;
}
