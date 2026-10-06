import { describe, it, expect } from 'vitest';
import { scaleIngredient } from '../../src/domain/ingredientScaler';

describe('ingredientScaler', () => {
  it('should scale up correctly (recipe on 3 portions -> calculation for 6)', () => {
    expect(scaleIngredient(100, 3, 6)).toBe(200);
  });

  it('should scale down correctly', () => {
    expect(scaleIngredient(200, 4, 2)).toBe(100);
  });

  it('should handle different base portions', () => {
    expect(scaleIngredient(150, 2, 5)).toBe(375); // 150 * 2.5
    expect(scaleIngredient(50, 1, 4)).toBe(200);
  });

  it('should handle fractional amounts', () => {
    expect(scaleIngredient(1.5, 2, 3)).toBeCloseTo(2.25);
    expect(scaleIngredient(0.5, 4, 2)).toBeCloseTo(0.25);
  });

  it('should throw if base servings is zero or negative', () => {
    expect(() => scaleIngredient(100, 0, 4)).toThrow();
    expect(() => scaleIngredient(100, -2, 4)).toThrow();
  });
});
